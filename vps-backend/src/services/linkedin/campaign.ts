import db from '../../db/client';
import { ulid } from 'ulid';
import { getLinkedInBrowser } from './browser';
import { createLogger } from '../../logger';

const log = createLogger('linkedin-campaign');

// ─── Daily Limits (conservative — below LinkedIn detection thresholds) ──────

const DAILY_LIMITS = {
  connections: 40,   // Dripify allows 75, we stay at 40 for safety
  messages: 80,
  inmails: 20,
  profile_views: 150,
  endorsements: 30,
  likes: 40,
  follows: 40,
};

export interface SequenceStep {
  action: 'view_profile' | 'connect' | 'message' | 'inmail' | 'follow' | 'endorse' | 'like';
  delay_hours: number;      // hours to wait after previous step
  template?: string;         // message template with {{name}}, {{company}} placeholders
  condition?: 'if_connected' | 'if_not_connected' | 'always'; // default: always
}

export interface CampaignData {
  id: string;
  name: string;
  status: string;
  search_url: string;
  sequence: SequenceStep[];
  daily_limit: number;
  working_hours_start: number;
  working_hours_end: number;
  timezone: string;
  stats: Record<string, number>;
  created_at: string;
}

// ─── Campaign CRUD ─────────────────────────────────────────────────────────────

export function createCampaign(data: { name: string; search_url: string; sequence: SequenceStep[]; daily_limit?: number }): CampaignData {
  const id = ulid();
  const stmt = db.prepare(`
    INSERT INTO linkedin_campaigns (id, name, search_url, sequence, daily_limit, status)
    VALUES (?, ?, ?, ?, ?, 'draft')
  `);
  stmt.run(id, data.name, data.search_url, JSON.stringify(data.sequence), data.daily_limit || 25);
  log.info(`Campaign created: ${data.name} (${id})`);
  return getCampaign(id)!;
}

export function getCampaign(id: string): CampaignData | null {
  const row: any = db.prepare('SELECT * FROM linkedin_campaigns WHERE id = ?').get(id);
  if (!row) return null;
  return { ...row, sequence: JSON.parse(row.sequence), stats: JSON.parse(row.stats || '{}') };
}

export function listCampaigns(): CampaignData[] {
  const rows: any[] = db.prepare('SELECT * FROM linkedin_campaigns ORDER BY created_at DESC').all();
  return rows.map(r => ({ ...r, sequence: JSON.parse(r.sequence), stats: JSON.parse(r.stats || '{}') }));
}

export function updateCampaignStatus(id: string, status: string) {
  db.prepare('UPDATE linkedin_campaigns SET status = ?, updated_at = datetime("now") WHERE id = ?').run(status, id);
}

export function deleteCampaign(id: string) {
  db.prepare('DELETE FROM linkedin_prospects WHERE campaign_id = ?').run(id);
  db.prepare('DELETE FROM linkedin_campaigns WHERE id = ?').run(id);
}

// ─── Prospect Management ───────────────────────────────────────────────────────

export function addProspects(campaignId: string, prospects: { profileUrl: string; name: string; headline: string; company: string }[]) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO linkedin_prospects (id, campaign_id, profile_url, name, headline, company)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    for (const p of prospects) {
      stmt.run(ulid(), campaignId, p.profileUrl, p.name, p.headline, p.company);
    }
  });
  tx();
  log.info(`Added ${prospects.length} prospects to campaign ${campaignId}`);
}

export function getProspects(campaignId: string, status?: string) {
  if (status) {
    return db.prepare('SELECT * FROM linkedin_prospects WHERE campaign_id = ? AND status = ? ORDER BY created_at').all(campaignId, status);
  }
  return db.prepare('SELECT * FROM linkedin_prospects WHERE campaign_id = ? ORDER BY created_at').all(campaignId);
}

export function getProspectsDueForAction(): any[] {
  return db.prepare(`
    SELECT p.*, c.sequence, c.status as campaign_status
    FROM linkedin_prospects p
    JOIN linkedin_campaigns c ON p.campaign_id = c.id
    WHERE c.status = 'active'
      AND p.status NOT IN ('replied', 'skipped', 'error')
      AND (p.next_action_at IS NULL OR p.next_action_at <= datetime('now'))
    ORDER BY p.next_action_at ASC
    LIMIT 50
  `).all();
}

// ─── Daily Limit Tracking ──────────────────────────────────────────────────────

function getTodayLimits(): Record<string, number> {
  const today = new Date().toISOString().split('T')[0];
  const row: any = db.prepare('SELECT * FROM daily_limits_tracker WHERE date = ?').get(today);
  if (!row) {
    db.prepare('INSERT OR IGNORE INTO daily_limits_tracker (id, date) VALUES (?, ?)').run(ulid(), today);
    return { connections_sent: 0, messages_sent: 0, inmails_sent: 0, profiles_viewed: 0, endorsements: 0, likes: 0, follows: 0 };
  }
  return row;
}

function incrementLimit(field: string) {
  const today = new Date().toISOString().split('T')[0];
  db.prepare(`UPDATE daily_limits_tracker SET ${field} = ${field} + 1 WHERE date = ?`).run(today);
}

function canPerformAction(action: string): boolean {
  const limits = getTodayLimits();
  const mapping: Record<string, { field: string; max: number }> = {
    'connect': { field: 'connections_sent', max: DAILY_LIMITS.connections },
    'message': { field: 'messages_sent', max: DAILY_LIMITS.messages },
    'inmail': { field: 'inmails_sent', max: DAILY_LIMITS.inmails },
    'view_profile': { field: 'profiles_viewed', max: DAILY_LIMITS.profile_views },
    'endorse': { field: 'endorsements', max: DAILY_LIMITS.endorsements },
    'like': { field: 'likes', max: DAILY_LIMITS.likes },
    'follow': { field: 'follows', max: DAILY_LIMITS.follows },
  };
  const m = mapping[action];
  if (!m) return true;
  return (limits[m.field] || 0) < m.max;
}

// ─── Action Execution ──────────────────────────────────────────────────────────

function fillTemplate(template: string, prospect: any): string {
  return template
    .replace(/\{\{name\}\}/g, prospect.name?.split(' ')[0] || 'there')
    .replace(/\{\{full_name\}\}/g, prospect.name || '')
    .replace(/\{\{company\}\}/g, prospect.company || 'your company')
    .replace(/\{\{headline\}\}/g, prospect.headline || '');
}

export async function executeNextAction(prospect: any, sequence: SequenceStep[]): Promise<boolean> {
  const step = sequence[prospect.current_step];
  if (!step) {
    // All steps completed
    db.prepare('UPDATE linkedin_prospects SET status = ?, updated_at = datetime("now") WHERE id = ?').run('completed', prospect.id);
    return false;
  }

  if (!canPerformAction(step.action)) {
    log.warn(`Daily limit reached for ${step.action}`);
    return false;
  }

  // Check condition
  if (step.condition === 'if_connected' && prospect.status !== 'connected') return false;
  if (step.condition === 'if_not_connected' && prospect.status === 'connected') return false;

  const browser = getLinkedInBrowser();
  let success = false;

  try {
    switch (step.action) {
      case 'view_profile': {
        const info = await browser.viewProfile(prospect.profile_url);
        // Update prospect with scraped info
        db.prepare('UPDATE linkedin_prospects SET name = COALESCE(NULLIF(?, ""), name), headline = COALESCE(NULLIF(?, ""), headline), company = COALESCE(NULLIF(?, ""), company), connection_degree = COALESCE(NULLIF(?, ""), connection_degree) WHERE id = ?')
          .run(info.name, info.headline, info.company, info.connectionDegree, prospect.id);
        incrementLimit('profiles_viewed');
        success = true;
        break;
      }
      case 'connect': {
        const note = step.template ? fillTemplate(step.template, prospect) : undefined;
        success = await browser.sendConnectionRequest(prospect.profile_url, note);
        if (success) incrementLimit('connections_sent');
        break;
      }
      case 'message': {
        const msg = step.template ? fillTemplate(step.template, prospect) : 'Hey!';
        success = await browser.sendMessage(prospect.profile_url, msg);
        if (success) {
          incrementLimit('messages_sent');
          db.prepare('UPDATE linkedin_prospects SET status = ? WHERE id = ?').run('messaged', prospect.id);
        }
        break;
      }
      case 'follow':
        success = await browser.followProfile(prospect.profile_url);
        if (success) incrementLimit('follows');
        break;
      case 'endorse':
        success = await browser.endorseSkill(prospect.profile_url);
        if (success) incrementLimit('endorsements');
        break;
      case 'like':
        success = await browser.likeRecentPost(prospect.profile_url);
        if (success) incrementLimit('likes');
        break;
    }
  } catch (err: any) {
    log.error(`Action ${step.action} failed for ${prospect.profile_url}: ${err.message}`);
    db.prepare('UPDATE linkedin_prospects SET error_message = ?, updated_at = datetime("now") WHERE id = ?').run(err.message, prospect.id);
  }

  // Log the action
  db.prepare('INSERT INTO linkedin_actions_log (id, campaign_id, prospect_id, action_type, message_text, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(ulid(), prospect.campaign_id, prospect.id, step.action, step.template || null, success ? 'completed' : 'failed');

  if (success) {
    // Advance to next step, set next action time
    const nextStep = sequence[prospect.current_step + 1];
    const nextActionAt = nextStep
      ? new Date(Date.now() + nextStep.delay_hours * 3600_000).toISOString()
      : null;

    db.prepare(`
      UPDATE linkedin_prospects
      SET current_step = current_step + 1, last_action_at = datetime('now'), next_action_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(nextActionAt, prospect.id);
  }

  return success;
}

// ─── Campaign Stats ──────────────────────────────────────────────────────────

export function getCampaignStats(campaignId: string) {
  const total = (db.prepare('SELECT COUNT(*) as c FROM linkedin_prospects WHERE campaign_id = ?').get(campaignId) as any)?.c || 0;
  const byStatus: any[] = db.prepare('SELECT status, COUNT(*) as c FROM linkedin_prospects WHERE campaign_id = ? GROUP BY status').all(campaignId);
  const statusMap: Record<string, number> = {};
  byStatus.forEach((r: any) => { statusMap[r.status] = r.c; });
  const todayActions = (db.prepare("SELECT COUNT(*) as c FROM linkedin_actions_log WHERE campaign_id = ? AND executed_at >= date('now')").get(campaignId) as any)?.c || 0;
  return { total, ...statusMap, today_actions: todayActions };
}

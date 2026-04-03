import { Router, Request, Response } from 'express';
import { getLinkedInBrowser } from '../services/linkedin/browser';
import * as campaign from '../services/linkedin/campaign';

const router = Router();

// ─── Session ──────────────────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const browser = getLinkedInBrowser();
  await browser.launch();
  await browser.createContext();
  const success = await browser.login(email, password);
  return res.json({ success, message: success ? 'Logged in' : 'Login failed — may need 2FA verification' });
});

router.get('/session', async (_req: Request, res: Response) => {
  const browser = getLinkedInBrowser();
  try {
    await browser.launch();
    await browser.createContext();
    const loggedIn = await browser.isLoggedIn();
    return res.json({ loggedIn });
  } catch {
    return res.json({ loggedIn: false });
  }
});

// ─── Campaigns ────────────────────────────────────────────────────────────────

router.get('/campaigns', (_req: Request, res: Response) => {
  const campaigns = campaign.listCampaigns();
  const withStats = campaigns.map(c => ({ ...c, stats: campaign.getCampaignStats(c.id) }));
  return res.json({ campaigns: withStats });
});

router.post('/campaigns', (req: Request, res: Response) => {
  const { name, search_url, sequence, daily_limit } = req.body;
  if (!name || !sequence) return res.status(400).json({ error: 'name and sequence required' });
  const c = campaign.createCampaign({ name, search_url, sequence, daily_limit });
  return res.json({ campaign: c });
});

router.get('/campaigns/:id', (req: Request, res: Response) => {
  const c = campaign.getCampaign(req.params.id);
  if (!c) return res.status(404).json({ error: 'Campaign not found' });
  return res.json({ campaign: c, stats: campaign.getCampaignStats(c.id) });
});

router.patch('/campaigns/:id/status', (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['active', 'paused', 'completed', 'draft'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  campaign.updateCampaignStatus(req.params.id, status);
  return res.json({ success: true });
});

router.delete('/campaigns/:id', (req: Request, res: Response) => {
  campaign.deleteCampaign(req.params.id);
  return res.json({ success: true });
});

// ─── Prospects ────────────────────────────────────────────────────────────────

router.get('/campaigns/:id/prospects', (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const prospects = campaign.getProspects(req.params.id, status);
  return res.json({ prospects });
});

router.post('/campaigns/:id/prospects/import', async (req: Request, res: Response) => {
  const { search_url, max_results = 50 } = req.body;
  if (!search_url) return res.status(400).json({ error: 'search_url required' });

  const browser = getLinkedInBrowser();
  const loggedIn = await browser.isLoggedIn();
  if (!loggedIn) return res.status(401).json({ error: 'Not logged into LinkedIn' });

  const profiles = await browser.scrapeSearchResults(search_url, max_results);
  campaign.addProspects(req.params.id, profiles.map(p => ({
    profileUrl: p.profileUrl, name: p.name, headline: p.headline, company: p.company,
  })));
  return res.json({ imported: profiles.length });
});

router.post('/campaigns/:id/prospects/manual', (req: Request, res: Response) => {
  const { prospects } = req.body;
  if (!Array.isArray(prospects)) return res.status(400).json({ error: 'prospects array required' });
  campaign.addProspects(req.params.id, prospects);
  return res.json({ imported: prospects.length });
});

// ─── Actions ──────────────────────────────────────────────────────────────────

router.post('/actions/view', async (req: Request, res: Response) => {
  const { profile_url } = req.body;
  if (!profile_url) return res.status(400).json({ error: 'profile_url required' });
  const browser = getLinkedInBrowser();
  const info = await browser.viewProfile(profile_url);
  return res.json(info);
});

router.post('/actions/connect', async (req: Request, res: Response) => {
  const { profile_url, note } = req.body;
  if (!profile_url) return res.status(400).json({ error: 'profile_url required' });
  const browser = getLinkedInBrowser();
  const success = await browser.sendConnectionRequest(profile_url, note);
  return res.json({ success });
});

router.post('/actions/message', async (req: Request, res: Response) => {
  const { profile_url, message } = req.body;
  if (!profile_url || !message) return res.status(400).json({ error: 'profile_url and message required' });
  const browser = getLinkedInBrowser();
  const success = await browser.sendMessage(profile_url, message);
  return res.json({ success });
});

export default router;

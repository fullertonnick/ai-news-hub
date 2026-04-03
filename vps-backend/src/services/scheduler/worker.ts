import { getProspectsDueForAction, executeNextAction, type SequenceStep } from '../linkedin/campaign';
import { getLinkedInBrowser } from '../linkedin/browser';
import { createLogger } from '../../logger';

const log = createLogger('scheduler');

let running = false;

// Randomized delay between actions (45-120 seconds) to mimic human behavior
function actionDelay(): Promise<void> {
  const ms = 45_000 + Math.random() * 75_000;
  return new Promise(r => setTimeout(r, ms));
}

// Check if current time is within working hours (default: 9am-6pm CT)
function isWithinWorkingHours(): boolean {
  const now = new Date();
  const hour = now.getHours(); // Server timezone should be set to CT
  return hour >= 9 && hour < 18;
}

export async function runSchedulerCycle() {
  if (running) { log.warn('Scheduler cycle already running, skipping'); return; }
  if (!isWithinWorkingHours()) { log.info('Outside working hours, skipping cycle'); return; }

  running = true;
  log.info('Starting scheduler cycle');

  try {
    // Ensure browser is ready
    const browser = getLinkedInBrowser();
    await browser.launch();
    await browser.createContext();

    const loggedIn = await browser.isLoggedIn();
    if (!loggedIn) {
      log.error('Not logged into LinkedIn — session may have expired. Manual re-login required.');
      running = false;
      return;
    }

    // Get prospects that are due for their next action
    const prospects = getProspectsDueForAction();
    log.info(`${prospects.length} prospects due for action`);

    for (const prospect of prospects) {
      if (!isWithinWorkingHours()) {
        log.info('Working hours ended, stopping mid-cycle');
        break;
      }

      const sequence: SequenceStep[] = JSON.parse(prospect.sequence);
      const success = await executeNextAction(prospect, sequence);
      log.info(`${prospect.name || prospect.profile_url}: step ${prospect.current_step} → ${success ? 'success' : 'skipped/failed'}`);

      // Wait between actions to appear human
      await actionDelay();
    }
  } catch (err: any) {
    log.error(`Scheduler cycle error: ${err.message}`);
  }

  running = false;
  log.info('Scheduler cycle complete');
}

// Run every 5 minutes during working hours
let intervalId: NodeJS.Timeout | null = null;

export function startScheduler() {
  if (intervalId) return;
  log.info('Scheduler started — runs every 5 minutes during working hours');
  intervalId = setInterval(runSchedulerCycle, 5 * 60_000);
  // Also run immediately on start
  runSchedulerCycle();
}

export function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    log.info('Scheduler stopped');
  }
}

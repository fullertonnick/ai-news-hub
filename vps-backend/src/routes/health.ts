import { Router } from 'express';
import { getLinkedInBrowser } from '../services/linkedin/browser';

const router = Router();

router.get('/', async (_req, res) => {
  let linkedinStatus = 'unknown';
  try {
    const browser = getLinkedInBrowser();
    const loggedIn = await browser.isLoggedIn();
    linkedinStatus = loggedIn ? 'connected' : 'disconnected';
  } catch {
    linkedinStatus = 'error';
  }

  return res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    linkedin: linkedinStatus,
  });
});

export default router;

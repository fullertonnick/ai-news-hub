import type { NextApiRequest, NextApiResponse } from 'next';

const VPS_URL = process.env.VPS_URL || 'http://217.216.91.68:3002';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const r = await fetch(`${VPS_URL}/health`, { signal: AbortSignal.timeout(5000) });
    const data = await r.json();
    return res.json(data);
  } catch {
    return res.json({ status: 'offline', linkedin: 'unknown' });
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';

const VPS_URL = process.env.VPS_URL || 'http://217.216.91.68:3002';
const VPS_SECRET = process.env.VPS_SECRET || 'simpliscale-vps-2026-secret';

async function proxyToVPS(path: string, method: string, body?: any) {
  const r = await fetch(`${VPS_URL}/api/linkedin${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${VPS_SECRET}` },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  return r.json();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const data = await proxyToVPS('/campaigns', 'GET');
      return res.json(data);
    }
    if (req.method === 'POST') {
      const data = await proxyToVPS('/campaigns', 'POST', req.body);
      return res.json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.query;
      const data = await proxyToVPS(`/campaigns/${id}`, 'DELETE');
      return res.json(data);
    }
    if (req.method === 'PATCH') {
      const { id } = req.query;
      const data = await proxyToVPS(`/campaigns/${id}/status`, 'PATCH', req.body);
      return res.json(data);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(502).json({ error: 'VPS backend unavailable' });
  }
}

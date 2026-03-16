import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const pathSegments = req.query.path as string[];
  const path = pathSegments ? pathSegments.join('/') : '';
  const baseUrl = `${BACKEND_URL}/api/${path}`;
  const queryParams = { ...req.query };
  delete queryParams['path'];
  const queryString = new URLSearchParams(queryParams as Record<string, string>).toString();
  const fullUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;
  try {
    const fetchOptions: RequestInit = {
      method: req.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
    };
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }
    const response = await fetch(fullUrl, fetchOptions);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch {
    res.status(500).json({ error: 'Backend unavailable', items: [], topics: [], has_more: false });
  }
}

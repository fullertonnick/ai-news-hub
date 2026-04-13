import type { NextApiRequest, NextApiResponse } from 'next';

export const config = { maxDuration: 20 };

/**
 * Fetches a remote image and returns it as a base64 data URL.
 * Used to import web search results into the editor (avoids CORS for canvas export).
 *
 * POST body: { url: string }
 * Returns: { dataUrl: string }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url required' });

  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SimpliScale Carousel Bot)' },
    });
    if (!r.ok) return res.status(502).json({ error: 'Image fetch failed' });

    const buffer = await r.arrayBuffer();
    if (buffer.byteLength > 8 * 1024 * 1024) {
      return res.status(413).json({ error: 'Image too large (>8MB)' });
    }

    const base64 = Buffer.from(buffer).toString('base64');
    const mime = r.headers.get('content-type') || 'image/jpeg';

    return res.status(200).json({
      dataUrl: `data:${mime};base64,${base64}`,
    });
  } catch (err: any) {
    console.error('Image proxy error:', err);
    return res.status(500).json({ error: 'Proxy failed' });
  }
}

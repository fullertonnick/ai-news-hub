import type { NextApiRequest, NextApiResponse } from 'next';

export const config = { maxDuration: 30 };

/**
 * Search for real images on the web using DuckDuckGo's image search.
 * No API key required.
 *
 * Two-step flow:
 *   1. POST to duckduckgo.com to get a vqd token (anti-bot token)
 *   2. GET duckduckgo.com/i.js with the token to fetch image results
 *
 * POST body: { query: string, count?: number }
 * Returns: { images: Array<{ url, thumbnail, title, source }> }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query, count = 12 } = req.body;
  if (!query || typeof query !== 'string') return res.status(400).json({ error: 'query required' });

  try {
    // Step 1: Fetch the DuckDuckGo HTML page to extract the vqd token
    const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });
    const html = await tokenRes.text();

    // vqd token is embedded in the HTML — multiple possible patterns
    const vqdMatch = html.match(/vqd=["']?([\d-]+)["']?/) || html.match(/vqd=([\d-]+)&/);
    const vqd = vqdMatch?.[1];

    if (!vqd) {
      console.error('Could not extract vqd token from DDG');
      return res.status(502).json({ error: 'Search initialization failed' });
    }

    // Step 2: Fetch image results JSON
    const imgUrl = new URL('https://duckduckgo.com/i.js');
    imgUrl.searchParams.set('l', 'us-en');
    imgUrl.searchParams.set('o', 'json');
    imgUrl.searchParams.set('q', query);
    imgUrl.searchParams.set('vqd', vqd);
    imgUrl.searchParams.set('f', ',,,,,');
    imgUrl.searchParams.set('p', '1'); // safe search on

    const imgRes = await fetch(imgUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://duckduckgo.com/',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!imgRes.ok) {
      console.error('DDG image search failed:', imgRes.status);
      return res.status(502).json({ error: 'Image search failed' });
    }

    const data = await imgRes.json();
    const images = (data.results || []).slice(0, Math.min(20, count)).map((item: any) => ({
      url: item.image,
      thumbnail: item.thumbnail || item.image,
      title: item.title || '',
      source: item.source || item.url || '',
      width: item.width,
      height: item.height,
    }));

    return res.status(200).json({ images });
  } catch (err: any) {
    console.error('Image search error:', err?.message || err);
    return res.status(500).json({ error: 'Search failed', detail: err?.message });
  }
}

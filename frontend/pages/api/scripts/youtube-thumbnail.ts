import type { NextApiRequest, NextApiResponse } from 'next';

export const config = { maxDuration: 60 };
import { NEGATIVE_PROMPT } from '../../../app/lib/generateBackgroundPrompts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { title, style = 'face-text' } = req.body;
  if (!title || typeof title !== 'string') return res.status(400).json({ error: 'title required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  const stylePrompts: Record<string, string> = {
    'face-text':
      `Dark cinematic background for YouTube thumbnail about "${title}", dramatic orange and teal lighting, professional studio atmosphere, space on left side for face cutout and right side for bold text, deep shadows, bokeh background, premium look, no text, no faces, no people, 4K`,
    'dramatic':
      `Dark dramatic cinematic scene representing "${title}", intense orange lighting from one side, deep shadows, high contrast, professional photography, moody atmosphere, tech/business aesthetic, no text, no faces, no people, 4K ultra detailed`,
    'before-after':
      `Dark split-screen background for YouTube thumbnail, left side dim and muted (old/struggling), right side bright orange and energetic (new/thriving), dramatic lighting contrast, professional, no text, no faces, no people, 4K`,
  };

  const prompt = stylePrompts[style] || stylePrompts['face-text'];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '16:9',
            negativePrompt: NEGATIVE_PROMPT,
            personGeneration: 'dont_allow',
            safetySetting: 'block_low_and_above',
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('Thumbnail API error:', await response.text());
      return res.status(response.status).json({ error: 'Thumbnail generation failed' });
    }

    const data = await response.json();
    const imageBase64 = data?.predictions?.[0]?.bytesBase64Encoded;
    if (!imageBase64) return res.status(500).json({ error: 'No image generated' });

    return res.json({ dataUrl: `data:image/png;base64,${imageBase64}` });
  } catch (err: any) {
    if (err?.name === 'AbortError') return res.status(504).json({ error: 'Thumbnail generation timed out' });
    console.error('Thumbnail error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    clearTimeout(timeout);
  }
}

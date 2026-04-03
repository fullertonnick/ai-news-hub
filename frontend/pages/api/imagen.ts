import type { NextApiRequest, NextApiResponse } from 'next';
import { NEGATIVE_PROMPT } from '../../app/lib/generateBackgroundPrompts';

// Tell Vercel to allow up to 60s for this function (requires Pro plan)
export const config = { maxDuration: 60 };

const TIMEOUT_MS = 55_000; // 55s — below Vercel's 60s limit

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, negative_prompt } = req.body;

  // Input validation
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'prompt must be a non-empty string' });
  if (prompt.length > 2000) return res.status(400).json({ error: 'prompt exceeds 2000 character limit' });
  if (negative_prompt && typeof negative_prompt !== 'string') return res.status(400).json({ error: 'negative_prompt must be a string' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  // Single source of truth — import from generateBackgroundPrompts
  const fullNegative = negative_prompt ? `${NEGATIVE_PROMPT}, ${negative_prompt}` : NEGATIVE_PROMPT;

  const attempt = async (signal: AbortSignal): Promise<Response> => {
    return fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '3:4',
            negativePrompt: fullNegative,
            personGeneration: 'dont_allow',
            safetySetting: 'block_low_and_above',
          },
        }),
      }
    );
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let response = await attempt(controller.signal);

    // Retry once on rate limit with 2s backoff
    if (response.status === 429) {
      await new Promise(r => setTimeout(r, 2000));
      response = await attempt(controller.signal);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Imagen 3 API error:', errorText);
      // Don't leak raw API error details to client
      return res.status(response.status).json({ error: 'Imagen 3 generation failed' });
    }

    const data = await response.json();
    const imageBase64 = data?.predictions?.[0]?.bytesBase64Encoded;

    if (!imageBase64) {
      // Safety filter or empty response — log internally, sanitize for client
      const reason = data?.predictions?.[0]?.safetyAttributes ? 'safety_filter' : 'empty_response';
      console.error(`Imagen 3 ${reason}:`, JSON.stringify(data));
      return res.status(500).json({ error: 'No image generated', reason });
    }

    return res.status(200).json({
      imageBase64,
      dataUrl: `data:image/png;base64,${imageBase64}`,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.error('Imagen 3 timeout after', TIMEOUT_MS, 'ms');
      return res.status(504).json({ error: 'Image generation timed out' });
    }
    console.error('Imagen 3 fetch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    clearTimeout(timeout);
  }
}

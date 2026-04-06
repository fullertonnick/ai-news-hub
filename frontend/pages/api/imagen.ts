import type { NextApiRequest, NextApiResponse } from 'next';

export const config = { maxDuration: 60 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'prompt must be a non-empty string' });
  if (prompt.length > 3000) return res.status(400).json({ error: 'prompt exceeds 3000 character limit' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  // ── Use Nano Banana Pro (generateContent API, not predict) ──────────────────
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);

  try {
    // Try up to 2 times on empty response
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/nano-banana-pro-preview:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Generate an image: ${prompt}` }] }],
            generationConfig: {
              responseModalities: ['IMAGE', 'TEXT'],
              responseMimeType: 'text/plain',
            },
          }),
        }
      );

      if (response.status === 429) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      if (!response.ok) {
        console.error('Nano Banana API error:', await response.text());
        return res.status(response.status).json({ error: 'Image generation failed' });
      }

      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];

      // Find the image part
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/jpeg';
          return res.status(200).json({
            dataUrl: `data:${mime};base64,${part.inlineData.data}`,
          });
        }
      }

      // No image in response — retry
      console.error(`Nano Banana empty response (attempt ${attempt + 1})`);
      await new Promise(r => setTimeout(r, 1000));
    }

    return res.status(500).json({ error: 'No image generated after 2 attempts' });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return res.status(504).json({ error: 'Image generation timed out' });
    }
    console.error('Image generation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    clearTimeout(timeout);
  }
}

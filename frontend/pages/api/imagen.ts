import type { NextApiRequest, NextApiResponse } from 'next';

export const config = { maxDuration: 60 };

// Attempt image generation via Imagen 3 Fast (higher quality, purpose-built for image synthesis).
// Returns base64 data URL on success, null on any failure.
async function tryImagen3(prompt: string, apiKey: string, signal: AbortSignal): Promise<string | null> {
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-fast-generate-001:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '3:4',
            safetyFilterLevel: 'block_only_high',
            personGeneration: 'dont_allow',
          },
        }),
      }
    );
    if (!r.ok) return null;
    const data = await r.json();
    const pred = data?.predictions?.[0];
    if (pred?.bytesBase64Encoded) {
      const mime = pred.mimeType || 'image/jpeg';
      return `data:${mime};base64,${pred.bytesBase64Encoded}`;
    }
    return null;
  } catch {
    return null;
  }
}

// Fallback: Gemini 2.0 Flash multimodal image generation.
async function tryGeminiFlash(prompt: string, apiKey: string, signal: AbortSignal): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Generate an image: ${prompt}` }] }],
            generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
          }),
        }
      );
      if (r.status === 429) {
        await new Promise(x => setTimeout(x, (attempt + 1) * 2000));
        continue;
      }
      if (!r.ok) {
        if (r.status >= 400 && r.status < 500) return null; // permanent error, don't retry
        await new Promise(x => setTimeout(x, 1500));
        continue;
      }
      const data = await r.json();
      for (const part of (data?.candidates?.[0]?.content?.parts || [])) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/jpeg';
          return `data:${mime};base64,${part.inlineData.data}`;
        }
      }
      await new Promise(x => setTimeout(x, 1500));
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
    }
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'prompt must be a non-empty string' });
  if (prompt.length > 3000) return res.status(400).json({ error: 'prompt exceeds 3000 character limit' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);

  // Append safety rules if not already present (generate-bg-prompt always includes them).
  const alreadySafe = /no text|no faces|no people/i.test(prompt);
  const safePrompt = alreadySafe
    ? prompt.trim()
    : `${prompt.trim()}, no text, no words, no letters, no typography, no faces, no people, no hands, no human figures, no logos, near-black background, cinematic portrait`;

  try {
    // Imagen 3 Fast: purpose-built image model, better quality and prompt adherence.
    const imagen3Result = await tryImagen3(safePrompt, apiKey, controller.signal);
    if (imagen3Result) return res.status(200).json({ dataUrl: imagen3Result });

    // Fallback to Gemini 2.0 Flash multimodal if Imagen 3 is unavailable or rejected.
    const flashResult = await tryGeminiFlash(safePrompt, apiKey, controller.signal);
    if (flashResult) return res.status(200).json({ dataUrl: flashResult });

    return res.status(500).json({ error: 'No image generated — try regenerating with a different prompt' });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return res.status(504).json({ error: 'Image generation timed out — try again' });
    }
    console.error('Image generation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    clearTimeout(timeout);
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, negative_prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  const NEGATIVE_BASE = 'text, typography, letters, numbers, watermarks, logos, UI elements, faces, people, blurry, low quality, pixelated, oversaturated, light backgrounds, white background, cartoonish, anime, illustration style, split screen, collage';
  const fullNegative = negative_prompt ? `${NEGATIVE_BASE}, ${negative_prompt}` : NEGATIVE_BASE;

  const attempt = async (): Promise<Response> => {
    return fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '4:5',
            negativePrompt: fullNegative,
            personGeneration: 'dont_allow',
            safetySetting: 'block_some',
          },
        }),
      }
    );
  };

  try {
    let response = await attempt();

    // Retry once on rate limit
    if (response.status === 429) {
      await new Promise(r => setTimeout(r, 2000));
      response = await attempt();
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Imagen 3 API error:', errorText);
      return res.status(response.status).json({ error: 'Imagen 3 generation failed', details: errorText });
    }

    const data = await response.json();
    const imageBase64 = data?.predictions?.[0]?.bytesBase64Encoded;

    if (!imageBase64) {
      console.error('Imagen 3 empty response:', JSON.stringify(data));
      return res.status(500).json({ error: 'No image returned from Imagen 3', raw: data });
    }

    return res.status(200).json({
      imageBase64,
      dataUrl: `data:image/png;base64,${imageBase64}`,
    });
  } catch (err) {
    console.error('Imagen 3 fetch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';
import Replicate from 'replicate';

export const config = { maxDuration: 60 };

// Nick's physical description — consistent across all thumbnails
const NICK_DESC = 'professional young man with curly brown hair and mustache, confident expression';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { title, style = 'face-text' } = req.body;
  if (!title || typeof title !== 'string') return res.status(400).json({ error: 'title required' });

  const replicateKey = process.env.REPLICATE_API_TOKEN;
  if (!replicateKey) return res.status(500).json({ error: 'REPLICATE_API_TOKEN not configured' });

  const stylePrompts: Record<string, string> = {
    'face-text': `Professional YouTube thumbnail, 1280x720, ${NICK_DESC}, pointing finger at camera, bold text area at top reading "${title}", tech dashboard or AI graphics floating in background, orange and dark blue color scheme, studio lighting, high energy, viral YouTube style, 4K quality, highly detailed`,

    'dramatic': `Professional YouTube thumbnail, 1280x720, ${NICK_DESC}, shocked surprised expression, eyes wide open, mouth slightly open, dramatic studio lighting from side, "${title}" in bold impact text at top, AI/automation graphics floating, orange and teal accents, dark background, money or growth charts floating, 4K professional quality`,

    'before-after': `Professional YouTube thumbnail, 1280x720, split design, left side: stressed overwhelmed businessman at messy desk (muted gray tones), right side: ${NICK_DESC} relaxed and confident with laptop showing success dashboard (vibrant orange and blue tones), bold arrow pointing from left to right, text area at top for "${title}", professional quality, 4K`,

    'teaching': `Professional YouTube thumbnail, 1280x720, ${NICK_DESC}, gesturing with hand while explaining, whiteboard or screen behind showing flowchart or diagram, professional studio setup, text area at top for "${title}", warm professional lighting, trustworthy educational vibe, orange accent colors, 4K quality`,
  };

  const prompt = stylePrompts[style] || stylePrompts['face-text'];
  const negativePrompt = 'blurry, low quality, distorted face, ugly, deformed, bad anatomy, watermark, signature, extra fingers, extra limbs, disfigured, poorly drawn face, mutation';

  try {
    const replicate = new Replicate({ auth: replicateKey });

    const output = await replicate.run(
      'stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc',
      {
        input: {
          prompt,
          negative_prompt: negativePrompt,
          width: 1280,
          height: 720,
          num_outputs: 1,
          guidance_scale: 7.5,
          num_inference_steps: 40,
          scheduler: 'K_EULER',
        },
      }
    );

    // Replicate returns an array of URLs
    const imageUrl = Array.isArray(output) ? output[0] : null;
    if (!imageUrl) return res.status(500).json({ error: 'No image generated' });

    // Fetch the image and convert to base64 data URL
    const imageResponse = await fetch(imageUrl as string);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/png';

    return res.json({ dataUrl: `data:${mimeType};base64,${base64}` });
  } catch (err: any) {
    console.error('Thumbnail generation error:', err);
    return res.status(500).json({ error: 'Thumbnail generation failed', details: err?.message });
  }
}

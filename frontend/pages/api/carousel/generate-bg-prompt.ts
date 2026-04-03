import type { NextApiRequest, NextApiResponse } from 'next';

export const config = { maxDuration: 60 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic, slideText, slideType, category } = req.body;
  if (!topic || !slideText) return res.status(400).json({ error: 'topic and slideText required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fallback — generic dark cinematic prompt
    return res.json({
      prompt: `Dark cinematic background for Instagram carousel about "${topic}", moody lighting, orange and amber accents, professional atmosphere, deep shadows, bokeh depth of field, no text, no faces, no people, 4K`,
    });
  }

  const slideTypeGuidance: Record<string, string> = {
    cover_photo: 'This is the COVER slide — needs a dramatic, cinematic hero scene that captures attention. Show a workspace, environment, or abstract scene that represents the topic. Must have space at the bottom for a large bold headline.',
    code_block: 'This slide shows code/prompts — background should be a dark tech environment. Think glowing screens, keyboard macro shots, terminal aesthetics. Very dark, minimal, good for text overlay.',
    stats_grid: 'This slide shows data/statistics — background should be ultra minimal and dark. Subtle radial glow at center. Clean, professional, perfect for data cards on top.',
    steps_list: 'This slide shows action steps — background should have directional energy, subtle motion feeling. Dark with directional orange light suggesting forward movement.',
    diagram: 'This slide shows a workflow diagram — background should be abstract with subtle connection lines or network-like patterns. Dark, minimal, tech-forward.',
    big_quote: 'This slide features a quote — background should be dramatic and atmospheric. Single light source creating mood. Theatrical, premium brand feeling.',
    comparison: 'This slide shows before/after comparison — background should be dark and neutral, allowing the content cards to stand out. Minimal with subtle texture.',
    skill_card: 'This slide features a specific tool — background should feel premium and tool-focused. Dark product photography aesthetic.',
    cta_slide: 'This is the CTA slide — needs dramatic stage lighting. Single orange spotlight from above, deep black surround, premium brand atmosphere, theatrical.',
    none: 'Text-only slide — dark atmospheric background with subtle warmth. Professional, clean, perfect for reading text.',
  };

  const guidance = slideTypeGuidance[slideType] || slideTypeGuidance.none;

  const prompt = `Write an Imagen 3 image generation prompt for an Instagram carousel slide background image.

SLIDE CONTEXT:
- Topic: "${topic}"
- Slide text: "${slideText.slice(0, 300)}"
- Slide type: ${slideType}
- Category: ${category}

GUIDANCE: ${guidance}

STYLE REQUIREMENTS (SimpliScale brand):
- Dark, cinematic, professional
- Primary accent: warm orange (#FF7107) and amber tones
- Near-black backgrounds (#111111 base)
- Aspect ratio: 3:4 portrait
- Bokeh depth of field, cinematic lens
- Premium, modern, tech-forward aesthetic
- No text, no typography, no letters, no numbers
- No faces, no people, no UI elements
- Must work as a background WITH text overlaid on top

Return ONLY the prompt text — no JSON, no quotes, no explanation. Just the prompt.`;

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
      }),
    });
    const d = await r.json();
    const generatedPrompt = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    return res.json({ prompt: generatedPrompt });
  } catch {
    return res.json({
      prompt: `Dark cinematic background representing "${topic}", warm orange accent lighting, deep shadows, professional atmosphere, bokeh depth of field, no text, no faces, 4K`,
    });
  }
}

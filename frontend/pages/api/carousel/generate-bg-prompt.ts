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

  const prompt = `Write an Imagen 3 image generation prompt for an Instagram carousel slide background.

SLIDE CONTEXT:
- Topic: "${topic}"
- Slide text: "${slideText.slice(0, 300)}"
- Slide type: ${slideType}
- Content category: ${category}

VISUAL GUIDANCE FOR THIS SLIDE TYPE:
${guidance}

YOUR JOB:
Create a specific, vivid scene that is THEMATICALLY RELEVANT to the slide content above — not generic.
Think: if someone glances at this image for 2 seconds, they should feel the topic even without reading the text.

Examples of specific vs generic:
- GENERIC: "dark cinematic background, orange accents" ← boring, could be anything
- SPECIFIC (for a Claude Code slide): "dark developer workstation shot from above, mechanical keyboard illuminated by warm amber desk lamp, terminal window glowing on a second monitor, shallow depth of field, cinematic 35mm lens, deep shadows" ← feels like the topic

ABSOLUTE RULES:
- No text, no typography, no letters, no numbers, no words anywhere in the image
- No faces, no people, no human figures, no hands
- No UI elements, no screenshots, no icons with text
- No logos or branded elements
- Background must work with white text overlaid on top — keep it dark

BRAND STYLE:
- Near-black base (#111111)
- Warm orange (#FF7107) and amber accents — used sparingly as lighting, glow, or subtle color
- Cinematic lens quality, bokeh depth of field
- 3:4 portrait aspect ratio
- Premium, modern, high-contrast

Return ONLY the image generation prompt text. No JSON, no quotes, no preamble. Just the prompt.`;

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

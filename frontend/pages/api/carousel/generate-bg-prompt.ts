import type { NextApiRequest, NextApiResponse } from 'next';

export const config = { maxDuration: 60 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic, slideText, slideType, category } = req.body;
  if (!topic || !slideText) return res.status(400).json({ error: 'topic and slideText required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({
      prompt: `Dark cinematic background for Instagram carousel about "${topic}", moody lighting, warm orange and amber accents, professional atmosphere, deep shadows, bokeh depth of field, no text, no faces, no people, 4K portrait`,
    });
  }

  const slideTypeGuidance: Record<string, string> = {
    cover_photo: 'COVER SLIDE — dramatic, attention-grabbing hero scene. Wide establishing shot of a workspace, environment, or abstract scene that embodies the topic. Needs strong visual presence and space for headline text at the bottom.',
    code_block: 'CODE SLIDE — dark developer environment. Close-up macro shots of mechanical keyboard keys lit by warm amber backlight, terminal screens glowing green or amber in darkness, depth of field blur. Very dark, minimal, techy.',
    stats_grid: 'STATS SLIDE — ultra-minimal dark background. Very subtle radial glow at center, almost invisible texture. Think: dark product photography background. The data cards sit on top.',
    steps_list: 'STEPS SLIDE — dark background with subtle directional energy suggesting forward movement or progression. Blurred motion lines, staircase composition, ascending diagonal light.',
    diagram: 'DIAGRAM SLIDE — abstract dark background with subtle network or connection motifs. Think: circuit board macro, blurred fiber optic trails, or subtle hexagonal patterns. Minimal, tech-forward.',
    big_quote: 'QUOTE SLIDE — dramatic single-source atmospheric lighting. Think: a single spotlight beam cutting through dark smoke, or a candle flame in darkness. Theatrical, moody, premium.',
    comparison: 'COMPARISON SLIDE — dark neutral background, clean. Two subtle zones of different color temperature (cool blue left, warm orange right) hinting at before/after. Minimal so content cards stand out.',
    skill_card: 'SKILL CARD SLIDE — premium dark product photography aesthetic. Dark vignette, soft center glow, luxury brand visual quality. Think: high-end tech product shot.',
    cta_slide: 'CTA SLIDE — dramatic stage lighting. Single warm orange spotlight from above, deep black surround. Theatrical, premium, creates a sense of anticipation and action.',
    none: 'TEXT SLIDE — atmospheric dark background with subtle warmth. Clean and professional, perfect for reading. Very subtle texture, no distracting elements.',
  };

  const guidance = slideTypeGuidance[slideType] || slideTypeGuidance.none;

  const prompt = `Write an Imagen 3 image generation prompt for an Instagram carousel slide background.

SLIDE CONTEXT:
- Overall topic: "${topic}"
- This slide's text: "${slideText.slice(0, 300)}"
- Slide type: ${slideType}
- Content category: ${category}

VISUAL REQUIREMENT FOR THIS SLIDE TYPE:
${guidance}

YOUR JOB:
Extract 1-2 specific visual concepts directly from the slide text above, then build a scene around them.
The image should make a viewer think of this exact slide's subject matter after 2 seconds — not just the general topic.

SPECIFICITY EXAMPLES:
Topic "Claude Code memory" + slide about "CLAUDE.md file":
→ BAD: "dark tech background with orange accents"
→ GOOD: "dark desk setup with glowing terminal screen showing a text editor with blurred code, single amber desk lamp casting warm shadows on mechanical keyboard, shallow depth of field, cinematic 35mm"

Topic "Make.com automations" + slide about "webhook triggers":
→ BAD: "automation background"
→ GOOD: "dark server room corridor with warm amber floor LED strips, blurred motion of data center hardware, shallow depth of field, moody cinematic lighting, no text"

ABSOLUTE RULES — violating any of these makes the image unusable:
- NO text, NO typography, NO letters, NO numbers, NO words anywhere
- NO faces, NO people, NO human figures, NO hands, NO body parts
- NO UI elements, NO app screenshots, NO icons with text
- NO logos, NO brand marks
- Background must stay very dark (near #111111) so white text overlaid on it stays readable

BRAND STYLE:
- Near-black base, very dark overall
- Warm orange (#FF7107) and amber used sparingly — as lighting, glow, or accent color only
- Cinematic lens quality, bokeh depth of field preferred
- 3:4 portrait aspect ratio
- Premium, modern, high-contrast

Return ONLY the image generation prompt text. No JSON, no quotes, no preamble. Just the prompt itself.`;

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
      prompt: `Dark cinematic background representing "${topic}", warm orange accent lighting, deep shadows, professional atmosphere, bokeh depth of field, no text, no faces, 4K portrait`,
    });
  }
}

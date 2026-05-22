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

  // Pull concrete nouns from slide text to make the background scene specific
  const slideWords = slideText.slice(0, 300).toLowerCase();
  const conceptHints: string[] = [];
  if (/terminal|code|file|editor|command|script|repo|\.md|claude\.md/.test(slideWords)) conceptHints.push('glowing terminal screen with blurred amber-lit code, mechanical keyboard in foreground, shallow depth of field');
  if (/mcp|tool[_\s]call|tool_use|function[_\s]call|api\s*call/.test(slideWords)) conceptHints.push('dark server rack corridor, amber LED strips casting warm glow on blurred hardware, cinematic depth of field');
  if (/workflow|automat|trigger|webhook|module|connect|scenario/.test(slideWords)) conceptHints.push('dark server room with warm amber floor LEDs, blurred hardware racks, cinematic corridor perspective');
  if (/agent|ai model|claude|gemini|openai|anthropic|llm/.test(slideWords)) conceptHints.push('dark workspace with softly glowing screen showing abstract code, amber rim lighting, bokeh background');
  if (/memory|context|forget|remember|session|persist/.test(slideWords)) conceptHints.push('dark desk with glowing monitor showing blurred text document, single warm amber desk lamp, deep shadows');
  if (/token|context\s*window|limit|exceed|compress/.test(slideWords)) conceptHints.push('dark minimal background with single amber gauge/meter glow, deep shadows, cinematic bokeh');
  if (/revenue|money|income|roi|cost|profit|\$/.test(slideWords)) conceptHints.push('dark executive desk with warm amber lamp glow, blurred laptop screen, upscale office bokeh');
  if (/client|onboard|meet|call|team|proposal/.test(slideWords)) conceptHints.push('dark professional meeting room, single overhead warm spotlight, empty modern chairs, cinematic angle');
  if (/email|message|slack|notification|inbox|reply/.test(slideWords)) conceptHints.push('dark room with glowing amber phone screen bokeh, blurred notification light trails');
  if (/hook|hooks?|bash_tool|settings\.json|instruction/.test(slideWords)) conceptHints.push('dark mechanical keyboard with amber backlit keys, code on blurred screen behind, macro lens depth of field');
  if (/error|fail|break|crash|fix|debug/.test(slideWords)) conceptHints.push('dark workspace with single amber warning glow on monitor, blurred error text, moody cinematic lighting');
  if (/step|setup|install|configure|init/.test(slideWords)) conceptHints.push('dark home office desk, single warm amber lamp illuminating notebook and laptop, cinematic angle, shallow depth of field');
  if (/output|result|deliver|ship|produce|generat/.test(slideWords)) conceptHints.push('dark workspace with glowing screen showing finished deliverable, warm amber light from monitor, cinematic depth of field');
  if (/loop|repeat|schedule|automat|cron|trigger/.test(slideWords)) conceptHints.push('dark abstract visualization of circular amber glowing path on near-black, minimal, professional, bokeh, continuous flow');
  if (/data|file|row|record|process|extract|parse|chunk/.test(slideWords)) conceptHints.push('dark server rack corridor bathed in warm amber light, blurred hardware in background, cinematic perspective, bokeh');
  if (/team|hire|outsource|agency|client\b|proposal/.test(slideWords)) conceptHints.push('dark executive boardroom with single overhead warm spotlight, empty premium chairs, cinematic wide angle');
  if (/cost|saving|budget|price|fee|expense/.test(slideWords)) conceptHints.push('dark minimal desk with single warm amber lamp, closed laptop, simple luxury, bokeh office depth');
  if (/context\s*window|compress|summar|token\b/.test(slideWords)) conceptHints.push('dark minimal background with abstract amber horizontal gauge glow, near-black, cinematic, precision');
  if (/myth|wrong|mistake|fail|common|believe|think/.test(slideWords)) conceptHints.push('dark atmospheric background with single amber spotlight cutting through dark mist, theatrical, reveals-the-truth mood');

  // Type-specific scene fallbacks — used when slide text doesn't match any concept hint
  const SCENE_FALLBACKS: Record<string, string> = {
    cover_photo: 'dramatic dark home office at night, multiple ultrawide monitors with warm amber glow, mechanical keyboard foreground, bokeh depth of field, cinematic',
    code_block: 'extreme close-up dark mechanical keyboard with single amber-backlit key, dark background, macro photography, shallow depth of field',
    stats_grid: 'ultra-dark minimal background, deep charcoal gradient, subtle warm orange radial glow from center at low opacity, completely clean',
    steps_list: 'dark background with subtle directional amber light suggesting forward movement, ascending diagonal light rays, professional',
    diagram: 'abstract dark background with subtle orange glowing node network, blurred fiber optic trails, minimal tech-forward',
    big_quote: 'single warm spotlight beam cutting through dark atmospheric smoke, theatrical, moody, cinematic, high contrast',
    comparison: 'dark neutral background, two subtle zones of different color temperature — cool blue left, warm amber right, minimal',
    skill_card: 'premium dark product photography, dark vignette, soft warm center glow, luxury brand aesthetic, minimal',
    cta_slide: 'dramatic stage lighting, single intense warm orange spotlight circle from above, deep black surround, theatrical premium',
    checklist: 'dark minimal background, subtle amber radial glow, clean and professional, perfect for reading',
    none: 'atmospheric dark background with subtle warm texture, clean professional, very subtle orange glow on left edge',
  };

  const sceneHint = conceptHints.length > 0
    ? `SCENE CONCEPT (derived from slide text): ${conceptHints[0]}`
    : `SCENE: ${SCENE_FALLBACKS[slideType] || SCENE_FALLBACKS.none}`;

  const prompt = `Write an Imagen 3 image generation prompt for an Instagram carousel slide background.

SLIDE CONTEXT:
- Overall topic: "${topic}"
- This slide's text: "${slideText.slice(0, 250)}"
- Slide type: ${slideType}
- Category: ${category}

VISUAL REQUIREMENT:
${guidance}

${sceneHint}

YOUR JOB: Extract 1-2 concrete visual concepts directly from the slide text, then build a cinematic dark scene around them. A viewer should subconsciously associate the image with this slide's subject after 2 seconds — not just the general topic.

GOOD EXAMPLES:
Topic "Claude Code memory" + slide about CLAUDE.md:
→ "dark oak desk, glowing text editor on laptop screen showing blurred code files, single warm amber desk lamp, mechanical keyboard in foreground, shallow depth of field, cinematic 35mm lens"

Topic "Make.com automations" + slide about saving 20 hours per week:
→ "dark server room corridor, amber LED floor strips casting warm glow on hardware racks, blurred motion, moody cinematic lighting, shallow depth of field, 3:4 portrait"

ABSOLUTE RULES (breaking any makes the image unusable):
- ZERO text, letters, numbers, words, typography anywhere in the image
- ZERO faces, people, human figures, hands, or body parts
- ZERO UI elements, app screenshots, phone screens with readable content
- ZERO logos or brand marks
- Background MUST be very dark (near #0A0A0A) — white text will overlay it

BRAND STYLE:
- Near-black base throughout
- Warm orange (#FF7107) and amber ONLY as: accent lighting, bokeh, glow, rim light
- Cinematic lens quality — bokeh depth of field, 35mm feel
- 3:4 portrait orientation
- Premium, moody, high contrast

Return ONLY the prompt text. No JSON, no quotes, no explanation.`;

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
        thinkingConfig: { thinkingBudget: 0 },
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

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
  if (/terminal|code|file|editor|command|script|repo|\.md|claude\.md|claude\.json/.test(slideWords)) conceptHints.push('glowing terminal screen with blurred amber-lit code, mechanical keyboard in foreground, shallow depth of field, cinematic 35mm');
  if (/mcp|tool[_\s]call|tool_use|function[_\s]call|api\s*call/.test(slideWords)) conceptHints.push('dark server rack corridor with amber LED strips casting warm glow on blurred hardware, cinematic depth of field, near-black background');
  if (/workflow|automat|trigger|webhook|module|connect|scenario/.test(slideWords)) conceptHints.push('dark server room with warm amber floor LED strips, blurred hardware racks in background, cinematic corridor perspective, deep shadows');
  if (/agent|ai model|claude(?!\s*van)|gemini|openai|anthropic|llm|multi.agent/.test(slideWords)) conceptHints.push('dark futuristic workspace, single amber backlit laptop screen with abstract code glow, bokeh background nodes, cinematic rim lighting');
  if (/memory|context|forget|remember|session|persist/.test(slideWords)) conceptHints.push('dark oak desk with single warm amber desk lamp illuminating blurred notebook and glowing laptop screen, deep shadows on both sides');
  if (/token|context\s*window|limit|exceed|compress/.test(slideWords)) conceptHints.push('dark minimal backdrop, single amber indicator glow at center, barely visible geometric lines, cinematic bokeh');
  if (/revenue|money|income|roi|cost|profit|\$[\d]/.test(slideWords)) conceptHints.push('dark executive home office, warm amber desk lamp glow on polished wood, blurred laptop screen in background, upscale bokeh');
  if (/client|onboard|meet|call|team|proposal|contract/.test(slideWords)) conceptHints.push('dark professional conference room, single warm overhead spotlight on empty table, modern chairs in silhouette, cinematic angle');
  if (/email|message|slack|notification|inbox|reply|dm/.test(slideWords)) conceptHints.push('dark room with single glowing amber phone screen bokeh, soft notification glow trails, deep shadows surrounding');
  if (/hook|hooks?|bash_tool|settings\.json|pre.tool|post.tool/.test(slideWords)) conceptHints.push('dark mechanical keyboard with orange-amber backlit keys in focus, blurred code on screen behind, extreme macro depth of field');
  if (/error|fail|break|crash|fix|debug|silent/.test(slideWords)) conceptHints.push('dark workspace, single amber warning light glow on monitor, blurred red indicator in background, moody cinematic lighting');
  if (/step|setup|install|configure|init|create|add/.test(slideWords)) conceptHints.push('dark minimal home office desk, single warm amber lamp casting pool of light on keyboard, cinematic angle, shallow depth of field');
  if (/time|hours?|minutes?|faster|slow|speed|week/.test(slideWords)) conceptHints.push('dark workspace with amber-lit hourglass silhouette bokeh, dramatic side lighting, near-black background, cinematic composition');
  if (/prompt|system\s*prompt|instruction|context\s*inject/.test(slideWords)) conceptHints.push('dark library shelf of blurred books, single warm amber reading lamp, leather desk surface, scholarly cinematic atmosphere');

  // Use category as additional fallback hint when no slide-text concepts matched
  const categoryFallbacks: Record<string, string> = {
    'claude-code': 'dark developer workspace, glowing terminal in background, mechanical keyboard with amber backlit keys, single amber desk lamp, cinematic 35mm depth of field',
    'make-automation': 'dark server room with amber LED floor strips, blurred workflow nodes glowing warm orange, cinematic corridor depth of field',
    'ai-agents': 'dark futuristic workspace, abstract amber glowing network nodes bokeh, blurred code terminal, cinematic rim lighting',
    'business-ai': 'dark executive office, single warm amber desk lamp, blurred city lights through floor-to-ceiling window, premium bokeh',
  };
  const sceneHint = conceptHints.length > 0
    ? `SCENE CONCEPT (derived from slide text): ${conceptHints[0]}`
    : `SCENE: ${categoryFallbacks[category] || 'dark cinematic workspace with warm amber desk lamp, deep shadows, bokeh depth of field, near-black background'}`;

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

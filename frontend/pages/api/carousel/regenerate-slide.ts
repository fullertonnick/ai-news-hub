import type { NextApiRequest, NextApiResponse } from 'next';
import { stripForbidden, fixAccentWord, extractGeminiText } from '@/lib/carousel-lib';

export const config = { maxDuration: 60 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic, slideIndex, totalSlides, currentText, style, category } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({ text: null, accent_word: null });
  }

  const total = totalSlides || 5;
  const isFirst = slideIndex === 0;
  const isLast = slideIndex === total - 1;
  const position = isFirst ? 'COVER (first slide)' : isLast ? 'CTA (last slide)' : `content slide ${slideIndex + 1} of ${total}`;

  const categoryHints: Record<string, string> = {
    'claude-code': 'Use specific Claude Code terminology: CLAUDE.md, /hooks, tool_use, context window, session. Name exact files and commands.',
    'make-automation': 'Use specific Make.com terminology: scenarios, modules, webhooks, error handlers, data stores. Name real integrations.',
    'ai-agents': 'Use specific agent terminology: orchestration, sub-agents, tool calls, memory types. Reference real frameworks.',
    'business-ai': 'Use specific numbers (hours saved, revenue impact). Name the exact tools and workflows.',
  };

  const prompt = `You are rewriting a single Instagram carousel slide for Nick Cornelius (@thenickcornelius).

Topic: "${topic}"
Category: ${category || 'general'}
${categoryHints[category] ? `${categoryHints[category]}\n` : ''}Style: ${style || 'tech_breakdown'}
Slide position: ${position}
Current text: "${currentText}"

━━━ REWRITE RULES ━━━
- Pass the Bullshit Test: specific numbers, novel insight, every sentence earns its place
- 2–4 sentences max. End with a kicker. Last line should land hard.
- Second person, present tense. Fragments OK.
- FORBIDDEN: leverage, synergy, seamless, empower, unlock, revolutionize, supercharge, utilize, paradigm
- Concrete: "Claude reads your repo in 15s" NOT "AI understands your codebase"

━━━ ACCENT WORD ━━━
accent_word MUST appear verbatim in the text (case-insensitive). Pick what a reader would screenshot.
Priority: numbers with units ("3 hours", "$200/month", "4x") → file/tool/command names ("CLAUDE.md", "/hooks") → myth being busted → core mechanism → named concept
NEVER pick generic adjectives, filler words, or anything not in the text.
${isFirst ? `
━━━ COVER FORMAT ━━━
Bold headline 5-8 words + optional subtitle after \\n\\n in parens: (specific payoff, one line)
Example: "Claude Code forgets everything when you close the session\\n\\n(here's the 5-minute fix that makes it remember forever)"` : ''}${isLast ? `
━━━ CTA FORMAT ━━━
ONE compelling question that creates desire for the offer. Stop after the ?.
Never write "Comment X and I'll send you Y" — the slide template renders that automatically.
Make it feel like the punchline of the whole carousel.` : ''}

Return JSON only: {"text": "...", "accent_word": "..."}`;


  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: 500 },
        thinkingConfig: { thinkingBudget: 0 },
      }),
    });
    const d = await r.json();
    let text = extractGeminiText(d);
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) text = fenceMatch[1];
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];
    const parsed = JSON.parse(text.trim());
    let rawText = parsed.text || '';
    if (isLast) {
      rawText = rawText.replace(/\s*\n*Comment\s+\w+\s+and\s+I['']ll\s+send[\s\S]*/i, '').trim();
      rawText = rawText.replace(/\s*\n*Drop\s+["']?\w+["']?\s+in\s+the\s+comments?[\s\S]*/i, '').trim();
    }
    const cleanText = stripForbidden(rawText);
    return res.json({
      text: cleanText,
      accent_word: fixAccentWord(cleanText, parsed.accent_word),
    });
  } catch {
    // Return null text so the client skips the update and preserves current state + approvals
    return res.json({ text: null, accent_word: null });
  }
}

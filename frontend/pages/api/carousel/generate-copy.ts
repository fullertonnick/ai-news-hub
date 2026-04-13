import type { NextApiRequest, NextApiResponse } from 'next';

export const config = { maxDuration: 60 };

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function detectCategory(topic: string): string {
  const t = topic.toLowerCase();
  if (/claude(?!\s*van|\s*monet)/i.test(t) || /anthropic|mcp\b|claude code/.test(t)) return 'claude-code';
  if (/make\.com|\bmake\b|n8n|zapier|integromat|workflow|automat|onboard/.test(t)) return 'make-automation';
  if (/\bagent\b|\bagents\b|multi.agent|autonomous|agentic/.test(t)) return 'ai-agents';
  return 'business-ai';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic, style = 'tech_breakdown', research_context } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });

  const apiKey = process.env.GEMINI_API_KEY;
  const category = detectCategory(topic);

  const prompt = `You are writing an Instagram carousel for Nick Cornelius (@thenickcornelius), who runs AI automation businesses (KingCaller AI + SimpliScale, $70K+/month combined).

TOPIC: "${topic}"
${research_context?.full_research ? `\nRESEARCH:\n${research_context.full_research.slice(0, 3000)}` : ''}

═══════════════════════════════════════════════════════
WRITING STYLE — Tyler Germain (@itstylergermain)
═══════════════════════════════════════════════════════

Rules:
1. CONVERSATIONAL: Reads like explaining to one smart friend. Second person, present tense.
2. SHORT PUNCHY SENTENCES: Many under 6 words. Fragment sentences for impact.
3. EACH SLIDE ENDS WITH A KICKER: The last sentence is the emotional payoff.
4. CONCRETE OVER ABSTRACT: "One writes ads. One designs emails." NOT "AI can help with various tasks."
5. NO MARKETING SPEAK: Zero buzzwords. Plain language.
6. ACCENT WORD: One key phrase per slide gets highlighted in orange.

═══════════════════════════════════════════════════════
STRUCTURE — CHOOSE THE BEST FORMAT FOR THIS TOPIC
═══════════════════════════════════════════════════════

DO NOT default to "Level 1, Level 2, Level 3..." — that's only ONE possible format.

Pick the structure that fits the topic best:

- **Steps/How-To**: "Step 1: ... Step 2: ... Step 3: ..." — for tutorials, processes
- **List**: "Tool 1: ... Tool 2: ..." or "Tip 1: ... Tip 2: ..." — for collections, resources
- **Progressive Levels**: "Level 1 → Level 5" — ONLY for topics about skill progression or maturity stages
- **Before/After**: Problem → Discovery → New approach → Results — for transformation stories
- **Myth-Busting**: "Everyone thinks X... Here's what's actually true..." — for contrarian takes
- **Deep Dive**: Concept → How it works → Examples → Pro tips — for explaining one thing thoroughly
- **Comparison**: "Tool A does X. Tool B does Y." — for versus content

Use 5-9 content slides (not always 5). The number of slides should match the topic — 3 tools = 3 slides, 7 tips = 7 slides.

═══════════════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════════════

Write a carousel about "${topic}".

SLIDE 1 (COVER): Bold title + subtitle in parentheses.
- visual_type: "cover_photo"

SLIDES 2-N (CONTENT): Pick the right structure. Each slide:
- One clear idea
- 2-4 sentences, conversational, concrete
- Ends with a kicker line
- visual_type: "none"

LAST SLIDE (CTA):
- Question referencing the content
- "Comment '[KEYWORD]' and I'll send you [specific thing]"
- visual_type: "cta_slide"

KEYWORD: From the topic. Max 8 chars. ALL CAPS.

CAPTION: Conversational Instagram caption:
- Hook line matching the cover
- Bullet points previewing the content
- "Comment [KEYWORD] and I'll send you [thing] 🔥"
- "📌 Save this before you lose it"
- 10-15 hashtags

Return ONLY valid JSON (no markdown):
{
  "slides": [
    { "text": "...", "accent_word": "...", "section_label": null, "visual_type": "cover_photo" },
    { "text": "...", "accent_word": "...", "section_label": null, "visual_type": "none" },
    ...more content slides as needed...
    { "text": "CTA...", "accent_word": "...", "section_label": null, "visual_type": "cta_slide" }
  ],
  "caption": "...",
  "keyword": "KEYWORD"
}`;

  if (!apiKey) {
    // Fallback without AI
    const kw = /claude/i.test(topic) ? 'CLAUDE' : /make/i.test(topic) ? 'MAKE' : /agent/i.test(topic) ? 'AGENT' : 'BUILD';
    return res.json({
      slides: [
        { id: uid(), text: `${topic}\n\n(the complete breakdown...)`, accent_word: topic.split(/\s+/)[0], visual_type: 'cover_photo', backgroundStatus: 'pending' },
        { id: uid(), text: `Here's what most people get wrong about ${topic.toLowerCase()}.\n\nThey overthink it. They read 50 articles. They watch tutorials for weeks.\n\nThen they never start.`, accent_word: 'get wrong', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `The simplest approach:\n\nPick one tool. Learn the basics. Build something real in the first hour.\n\nPerfect is the enemy of done.`, accent_word: 'simplest approach', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `Here's exactly what I did:\n\nSet it up in 20 minutes. Connected it to my existing workflow. Let it run for a week.\n\nThe results spoke for themselves.`, accent_word: 'exactly what I did', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `Want the exact setup I use?\n\nComment "${kw}" and I'll send you the blueprint.`, accent_word: kw, visual_type: 'cta_slide', backgroundStatus: 'pending' },
      ],
      caption: `Most people overcomplicate ${topic.toLowerCase()}.\n\nHere's the simple version:\n\n→ What most get wrong\n→ The simplest approach\n→ My exact setup\n\nComment "${kw}" and I'll send you the full blueprint 🔥\n\n📌 Save this before you lose it\n\n#ai #automation #business #scale #simpliscale #thenickcornelius`,
      keyword: kw,
      category,
    });
  }

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 8000 },
      }),
    });
    const d = await r.json();
    let text = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (text.includes('```')) {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) text = match[1];
    }
    const parsed = JSON.parse(text.trim());
    const slides = (parsed.slides || []).map((s: any) => ({
      ...s, id: uid(), backgroundStatus: 'pending' as const,
    }));
    return res.json({ slides, caption: parsed.caption || '', keyword: parsed.keyword || 'BUILD', category });
  } catch (err) {
    console.error('Generate copy error:', err);
    return res.status(500).json({ error: 'Copy generation failed' });
  }
}

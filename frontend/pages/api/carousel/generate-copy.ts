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

  const prompt = `You are writing an Instagram carousel for Nick Cornelius (@thenickcornelius), who runs SimpliScale + KingCaller AI ($70K+/month combined). His audience: entrepreneurs, agency owners, and builders using AI to scale.

TOPIC: "${topic}"
${research_context?.full_research ? `\nRESEARCH:\n${research_context.full_research.slice(0, 3000)}` : ''}

═══════════════════════════════════════════════════════
BULLSHIT TEST — every slide must pass all 3
═══════════════════════════════════════════════════════
1. SPECIFICITY — Name the exact tool, number, time, or step. Not "a lot" → "3 hours". Not "AI" → "Claude 3.5". Not "faster" → "20x faster".
2. NOVELTY — Say something the reader doesn't already know. Obvious = cut it. Counter-intuitive beats conventional wisdom every time.
3. DENSITY — One key insight per slide. Every sentence must add information. If removing it loses nothing, cut it.

═══════════════════════════════════════════════════════
WRITING STYLE — Tyler Germain
═══════════════════════════════════════════════════════
- Second person, present tense. You are explaining to one smart friend.
- Many sentences under 6 words. Fragments for impact.
- Last sentence of each slide = the kicker. Make it land.
- NEVER use: leverage, synergy, game-changer, seamless, empower, unlock, revolutionize, supercharge.
- Concrete over abstract: "Claude reads your repo in 15s" NOT "AI understands your codebase."

═══════════════════════════════════════════════════════
ACCENT WORD — one key concept per slide, highlighted orange
═══════════════════════════════════════════════════════
The accent_word is the single most important concept on that slide.
Rules:
- It MUST appear verbatim somewhere in the slide text (exact match, case-insensitive)
- Pick the phrase that carries the most weight — the insight, the number, the surprise
- Examples: if the slide is about cutting 3 hours to 20 min → accent: "3 hours". If it's about memory persisting → accent: "memory". If it's about a specific tool → accent: the tool name.
- NOT random adjectives. NOT the slide title repeated. THE CORE INSIGHT.

═══════════════════════════════════════════════════════
STRUCTURE — pick the one that fits the topic, NOT always Levels
═══════════════════════════════════════════════════════
BANNED: "Level 1, Level 2, Level 3..." — only use this if the topic is explicitly about skill/maturity progression.

Available structures — pick whichever fits:
• Steps: "Step 1 → Step N" — tutorials, setup guides, processes with a clear sequence
• Numbered List: numbered items — tips, tools, examples (use section_label: "1.", "2.", etc.)
• Before/After: Problem → Discovery → Change → Result — transformation stories
• Myth-Busting: "Everyone thinks X... Reality: Y" — corrective takes, common mistakes
• Deep Dive: Concept → Mechanism → Real example → How to use it — explaining ONE thing thoroughly
• Comparison: "Option A vs Option B" — side-by-side, tradeoffs, which to use when

Slide count = content count. 5 steps = 5 slides. 7 tools = 7 slides. Do NOT pad or cut to hit a fixed number.
Range: 5–9 total slides including cover and CTA.

═══════════════════════════════════════════════════════
SLIDE STRUCTURE
═══════════════════════════════════════════════════════
SLIDE 1 (COVER):
- Short bold headline + (subtitle in parentheses that explains the payoff)
- visual_type: "cover_photo"
- section_label: null

SLIDES 2–N (CONTENT):
- One clear idea per slide
- 2–4 punchy sentences, ends with a kicker
- visual_type: "none"
- section_label: matches your structure e.g. "Step 1", "Myth #1", "Before", "Tool 1", "01." — or null if no labels fit

LAST SLIDE (CTA):
- A question that naturally flows from the content
- "Comment '[KEYWORD]' and I'll send you [specific, concrete thing]"
- visual_type: "cta_slide"
- section_label: null

KEYWORD: Max 8 characters, ALL CAPS, memorable, derived from the topic core concept.
Good: MEMORY, AGENTS, MAKE, CLAUDE, BUILD, HOOKS, CONTEXT
Bad: LEARNAI, WORKFLOW2, TIPS123

CAPTION (ready to paste into Instagram):
- Line 1: hook that matches or reframes the cover
- Empty line
- 3–5 bullet lines with → previewing key insights
- Empty line
- "Comment [KEYWORD] and I'll send you [specific thing] 🔥"
- "📌 Save this before you lose it"
- Empty line
- 10–15 relevant hashtags on one line

Return ONLY valid JSON, no markdown fences, no preamble:
{
  "slides": [
    { "text": "Claude Code memory system\\n\\n(how to give Claude a brain that never forgets)", "accent_word": "memory system", "section_label": null, "visual_type": "cover_photo" },
    { "text": "By default, Claude forgets everything when you close the terminal.\\n\\nEvery new session starts from scratch. You re-explain your project. You re-set context. You waste 10 minutes every time.\\n\\nThere's a fix.", "accent_word": "forgets everything", "section_label": "The Problem", "visual_type": "none" },
    { "text": "Claude Code reads a file called CLAUDE.md at the start of every session.\\n\\nPut anything in there and Claude knows it instantly. Project structure, tech stack, coding rules, your name.\\n\\nOne file. Zero re-explaining.", "accent_word": "CLAUDE.md", "section_label": "The Fix", "visual_type": "none" },
    { "text": "Want the exact CLAUDE.md template I use for every client project?\\n\\nComment 'MEMORY' and I'll send it over.", "accent_word": "MEMORY", "section_label": null, "visual_type": "cta_slide" }
  ],
  "caption": "Claude forgets everything when you close the terminal.\\n\\nHere's the fix:\\n\\n→ Why default Claude has no memory\\n→ What CLAUDE.md actually does\\n→ What to put in yours\\n→ My exact template\\n\\nComment MEMORY and I'll send you my full CLAUDE.md template 🔥\\n\\n📌 Save this before you lose it\\n\\n#claudecode #ai #automation #aitools #artificialintelligence #developer #devtools #coding #simpliscale #thenickcornelius #productivity #softwareengineering",
  "keyword": "MEMORY"
}

The example above is for a DIFFERENT topic — it shows format only. Now write the actual carousel for: "${topic}"`;

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

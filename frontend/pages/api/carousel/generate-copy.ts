import type { NextApiRequest, NextApiResponse } from 'next';

export const config = { maxDuration: 60 };

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

const FORBIDDEN: Record<string, string> = {
  leverage: 'use', utilize: 'use', synergy: 'teamwork',
  'game-changer': 'breakthrough', revolutionary: 'new',
  innovative: 'effective', seamless: 'smooth', empower: 'help',
  disruptive: 'new', 'cutting-edge': 'modern', supercharge: 'boost',
  revolutionize: 'change', unlock: 'open', paradigm: 'approach',
};

function stripForbidden(text: string): string {
  let r = text;
  for (const [bad, good] of Object.entries(FORBIDDEN)) {
    r = r.replace(new RegExp(`\\b${bad.replace(/-/g, '[- ]')}\\b`, 'gi'), good);
  }
  return r;
}

function detectCategory(topic: string): string {
  const t = topic.toLowerCase();
  if (/claude(?!\s*van|\s*monet)/i.test(t) || /anthropic|mcp\b|claude code/.test(t)) return 'claude-code';
  if (/make\.com|\bmake\b|n8n|zapier|integromat|workflow|automat|onboard/.test(t)) return 'make-automation';
  if (/\bagent\b|\bagents\b|multi.agent|autonomous|agentic/.test(t)) return 'ai-agents';
  return 'business-ai';
}

function styleHint(style: string): string {
  if (style === 'use_case_list') {
    return `STYLE HINT: "use_case_list" — Numbered List or Comparison. Each content slide = one real-world use case or example. section_labels: "Use Case 1", "Example 2", "01."`;
  }
  if (style === 'prompt_reveal') {
    return `STYLE HINT: "prompt_reveal" — Before/After or Myth-Busting. Build tension (what people believe, what goes wrong), then flip it. section_labels: "The Myth", "Reality", "Before", "After"`;
  }
  return `STYLE HINT: "tech_breakdown" — Deep Dive or Steps. Explain the mechanism: what it is → how it works → real example → how to apply it. section_labels: "The Problem", "The Fix", "Real Example", "How to Use It"`;
}

function fallbackKeyword(topic: string): string {
  const t = topic.toLowerCase();
  if (/memory|remember|context/.test(t)) return 'MEMORY';
  if (/claude/.test(t)) return 'CLAUDE';
  if (/make|automat|workflow/.test(t)) return 'AUTOMATE';
  if (/agent/.test(t)) return 'AGENTS';
  if (/hook/.test(t)) return 'HOOKS';
  if (/prompt/.test(t)) return 'PROMPTS';
  if (/revenue|money|income/.test(t)) return 'REVENUE';
  if (/tool|stack/.test(t)) return 'TOOLS';
  if (/system/.test(t)) return 'SYSTEM';
  const words = topic.toUpperCase().split(/\s+/).filter(w => !['THE', 'A', 'AN', 'HOW', 'TO', 'OF', 'IN', 'FOR', 'WITH', 'AND'].includes(w));
  return (words[0] || 'BUILD').slice(0, 8);
}

// If AI picks an accent_word that isn't in the slide text, extract the best word from the text.
function fixAccentWord(text: string, accentWord: string | undefined): string {
  if (!accentWord) return '';
  if (text.toLowerCase().includes(accentWord.toLowerCase())) return accentWord;
  // Find the most impactful word: numbers, tool names, or longest meaningful word
  const numMatch = text.match(/\b\d[\d,. ]*(?:%|x|hrs?|min|days?|weeks?|months?|k|\$)?\b/i);
  if (numMatch) return numMatch[0].trim();
  const words = text.split(/\s+/).filter(w => w.replace(/[^a-zA-Z]/g, '').length > 4);
  const stop = new Set(['their', 'there', 'where', 'every', 'which', 'about', 'after', 'before', 'while', 'doing', 'using', 'start', 'build', 'when', 'from', 'that', 'with', 'your', 'have', 'more', 'this', 'just', 'most']);
  const candidate = words.find(w => !stop.has(w.toLowerCase().replace(/[^a-z]/g, ''))) || words[0] || accentWord;
  return candidate.replace(/[^a-zA-Z0-9]/g, '');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic, style = 'tech_breakdown', research_context } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });

  const apiKey = process.env.GEMINI_API_KEY;
  const category = detectCategory(topic);

  const prompt = `You are writing an Instagram carousel for Nick Cornelius (@thenickcornelius) — SimpliScale + KingCaller AI, $70K+/month. Audience: entrepreneurs and agency owners who use AI to scale.

TOPIC: "${topic}"
${research_context?.full_research ? `\nRESEARCH:\n${research_context.full_research.slice(0, 2000)}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BULLSHIT TEST — every content slide must pass all 3:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPECIFICITY: Name the exact tool, number, time, or step.
  "a lot" → "3 hours". "AI" → "Claude". "faster" → "4x faster".
NOVELTY: Say something the reader doesn't already know.
  Obvious = cut it. Counter-intuitive > conventional wisdom.
DENSITY: One key insight per slide. Every sentence earns its place.
  If removing it loses nothing, cut it.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WRITING STYLE — Tyler Germain
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Second person, present tense. Talk to one smart friend.
- Many sentences under 6 words. Fragments for punch.
- Last sentence of each slide = the kicker. Make it land.
- FORBIDDEN WORDS: leverage, synergy, game-changer, seamless, empower,
  unlock, revolutionize, supercharge, innovative, utilize, paradigm.
- Concrete: "Claude reads your repo in 15s" NOT "AI understands your codebase"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCENT WORD — highlighted orange, one per slide
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE: accent_word MUST appear verbatim in the slide text (case-insensitive).
Pick the phrase that carries the most weight — the number, the tool, the surprise.
  - Slide about cutting 3 hrs to 20 min → "3 hours"
  - Slide about CLAUDE.md → "CLAUDE.md"
  - Slide about a myth → the thing being busted (e.g. "never forgets")
NOT: random adjectives, the slide title, a word that doesn't appear in text.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${styleHint(style)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRUCTURE — pick ONE that best fits this specific topic:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTELY BANNED: "Level 1, Level 2..." unless topic is explicitly about skill levels.

Choose the structure where each slide writes itself:
• Steps → "Step 1…Step N": tutorials, setup guides, sequential processes
• Numbered List → "01.…02.": tools, tips, examples without strict ordering
• Before/After → Problem → Discovery → Change → Result: transformation
• Myth-Busting → belief → reality → why it matters: corrective takes
• Deep Dive → What → Why → How → Example → Apply: one concept fully explained
• Comparison → Option A vs Option B → verdict: tradeoffs, which to choose

Slide count = how deep the topic needs to go.
  5 distinct steps → 5 content slides. 3 myths → 3 slides. Don't pad.
  Total range: 5–9 slides (including cover + CTA).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SLIDE SPECS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SLIDE 1 (COVER):
  text: 5-8 word bold headline + (subtitle in parens explaining the payoff)
  visual_type: "cover_photo"
  section_label: null

SLIDES 2 to N-1 (CONTENT):
  text: 2-4 punchy sentences, one idea, ends with a kicker
  visual_type: "none"
  section_label: label matching your chosen structure, or null

LAST SLIDE (CTA):
  text: One question that flows from the content, then:
    "Comment '[KEYWORD]' and I'll send you [specific concrete thing]"
  visual_type: "cta_slide"
  section_label: null

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KEYWORD: max 8 chars, ALL CAPS, core concept of the topic
  Good: MEMORY, CLAUDE, AGENTS, HOOKS, SYSTEM, CONTEXT, BUILD, REVENUE
  Bad: LEARNAI, TIPS123, WORKFLOW2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAPTION — ready to paste into Instagram:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Line 1: Hook (reframes the cover — not the slide text verbatim. Make it scroll-stopping.)
[blank line]
3-5 bullet lines with → previewing the key insights from the carousel
[blank line]
Comment [KEYWORD] and I'll send you [specific thing] 🔥
📌 Save this before you lose it
[blank line]
10-15 hashtags on one line (include #simpliscale #thenickcornelius)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Return ONLY valid JSON — no markdown fences, no prose before/after:
{
  "slides": [
    {
      "text": "Claude Code memory system\\n\\n(how to give Claude a brain that never forgets)",
      "accent_word": "memory system",
      "section_label": null,
      "visual_type": "cover_photo"
    },
    {
      "text": "By default, Claude forgets everything when you close the terminal.\\n\\nEvery session starts blank. You re-explain your stack. You re-set context. You waste 10 minutes every time.\\n\\nThere's a fix.",
      "accent_word": "forgets everything",
      "section_label": "The Problem",
      "visual_type": "none"
    },
    {
      "text": "Claude Code reads a file called CLAUDE.md at the start of every session.\\n\\nProject structure, tech stack, coding rules — Claude knows all of it instantly.\\n\\nOne file. Zero re-explaining.",
      "accent_word": "CLAUDE.md",
      "section_label": "The Fix",
      "visual_type": "none"
    },
    {
      "text": "Want the exact CLAUDE.md template I use for every client project?\\n\\nComment 'MEMORY' and I'll send it.",
      "accent_word": "MEMORY",
      "section_label": null,
      "visual_type": "cta_slide"
    }
  ],
  "caption": "Claude forgets everything the moment you close the terminal.\\n\\nHere's the fix:\\n\\n→ Why Claude has no memory by default\\n→ What CLAUDE.md actually does\\n→ What to put in yours\\n→ My exact template for client projects\\n\\nComment MEMORY and I'll send you the full template 🔥\\n📌 Save this before you lose it\\n\\n#claudecode #aitools #automation #artificialintelligence #developer #simpliscale #thenickcornelius #productivity #devtools #coding #solopreneur #agencyowner #aiagents #anthropic #techtools",
  "keyword": "MEMORY"
}

The JSON above shows CLAUDE.md as the topic — that's just the format example.
Now write the actual carousel for: "${topic}"`;

  if (!apiKey) {
    const kw = fallbackKeyword(topic);
    return res.json({
      slides: [
        { id: uid(), text: `${topic}\n\n(the complete breakdown)`, accent_word: topic.split(/\s+/).slice(0, 2).join(' ').toLowerCase(), visual_type: 'cover_photo', section_label: null, backgroundStatus: 'pending' },
        { id: uid(), text: `Here's what most people get wrong about ${topic.toLowerCase()}.\n\nThey overthink it. They read 50 articles. They never start.\n\nOne hour of doing beats a week of planning.`, accent_word: 'get wrong', section_label: 'The Problem', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `Pick one tool. Build something real in the first session. Measure what changes after 7 days.\n\nPerfect is the enemy of shipped.`, accent_word: '7 days', section_label: 'The Fix', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `The result: less manual work, more output, real time back.\n\nNot someday. This week.`, accent_word: 'This week', section_label: 'The Result', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `Want the exact setup I use?\n\nComment "${kw}" and I'll send you the blueprint.`, accent_word: kw, section_label: null, visual_type: 'cta_slide', backgroundStatus: 'pending' },
      ],
      caption: `Most people overcomplicate ${topic.toLowerCase()}.\n\nHere's the simple version:\n\n→ What most people get wrong\n→ The one-step fix\n→ My exact setup\n→ What changes after one week\n\nComment ${kw} and I'll send you the full blueprint 🔥\n📌 Save this before you lose it\n\n#ai #automation #business #scale #simpliscale #thenickcornelius #aitools #productivity #entrepreneurship #agencyowner`,
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
        generationConfig: { temperature: 0.85, maxOutputTokens: 8000 },
      }),
    });
    const d = await r.json();
    let text = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) text = fenceMatch[1];
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];
    const parsed = JSON.parse(text.trim());

    const slides = (parsed.slides || []).map((s: any) => {
      const cleanText = stripForbidden(s.text || '');
      return {
        ...s,
        text: cleanText,
        accent_word: fixAccentWord(cleanText, s.accent_word),
        id: uid(),
        backgroundStatus: 'pending' as const,
      };
    });

    const rawKw = (parsed.keyword || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    const keyword = rawKw.length >= 2 ? rawKw : fallbackKeyword(topic);
    const caption = stripForbidden(parsed.caption || '');
    return res.json({ slides, caption, keyword, category });
  } catch (err) {
    console.error('Generate copy error:', err);
    return res.status(500).json({ error: 'Copy generation failed. Try again.' });
  }
}

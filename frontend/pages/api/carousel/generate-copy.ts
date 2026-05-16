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

const VALID_VISUAL_TYPES = new Set(['cover_photo', 'code_block', 'stats_grid', 'diagram', 'steps_list', 'skill_card', 'big_quote', 'comparison', 'checklist', 'cta_slide', 'none']);

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
- Last sentence of each slide = the kicker. Make it land hard.
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
ABSOLUTELY BANNED: "Level 1, Level 2..." — never use this.
AVOID DEFAULTING TO: "The Problem / The Fix" — only use if the topic is a direct pain/solution story.

Choose the structure where each slide writes itself:
• Steps → "Step 1…Step N": setup guides, how-to tutorials, sequential processes
• Numbered List → "01.…02.": tools, tips, or examples without strict ordering
• Before/After → "Before" then "After": transformation, contrast, what changed
• Myth-Busting → "The Myth" then "Reality": correcting beliefs people hold
• Deep Dive → What it is → Why it matters → How it works → Real example → How to apply
• Comparison → Side A vs Side B → pick one: tradeoffs, which to choose and why

The right structure makes every slide title obvious. If you can't title a slide naturally, you picked the wrong structure.

Slide count = how deep the topic actually needs to go. Don't pad.
  5 distinct steps → 5 content slides. 3 myths → 3 slides. 7 tools → 7 slides.
  Total range: 5–10 slides (including cover + CTA).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SLIDE SPECS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SLIDE 1 (COVER):
  text: 5-8 word bold headline + (subtitle in parens with the specific payoff)
  visual_type: "cover_photo"
  section_label: null

SLIDES 2 to N-1 (CONTENT):
  text: 2-4 punchy sentences, one idea, ends with a kicker
  visual_type: "none"
  section_label: the label from your chosen structure (e.g. "Step 1", "01.", "The Myth", "Before", "What it is") — or null if none needed

LAST SLIDE (CTA):
  text: One question that flows naturally from the content, then:
    "Comment '[KEYWORD]' and I'll send you [specific concrete deliverable]"
  visual_type: "cta_slide"
  section_label: null

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KEYWORD: max 8 chars, ALL CAPS, the single core concept
  Good: MEMORY, CLAUDE, AGENTS, HOOKS, SYSTEM, CONTEXT, BUILD, REVENUE, ERRORS, STACK
  Bad: LEARNAI, TIPS123, WORKFLOW2, CLICKME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAPTION — ready to paste into Instagram:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Line 1: Hook — one sentence that reframes the topic. NOT the slide headline verbatim. Scroll-stopping.
[blank line]
3-5 lines starting with → that preview the key insights (not slide titles — actual insights)
[blank line]
Comment [KEYWORD] and I'll send you [specific thing] 🔥
📌 Save this before you lose it
[blank line]
10-15 hashtags on one line (must include #simpliscale #thenickcornelius)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMAT EXAMPLE — shows JSON structure ONLY. Topic and structure below are unrelated to your task.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "slides": [
    {
      "text": "Your Make.com automation is silently failing\\n\\n(and you won't know until a client is already angry)",
      "accent_word": "silently failing",
      "section_label": null,
      "visual_type": "cover_photo"
    },
    {
      "text": "Make.com scenarios fail with zero notification by default.\\n\\nYour trigger fires, hits an API error, and stops. No alert. No fallback. Client data queues up going nowhere.\\n\\nThat's the out-of-the-box behavior.",
      "accent_word": "zero notification",
      "section_label": "Before",
      "visual_type": "none"
    },
    {
      "text": "Add an Error Handler route after every HTTP module. Route failures to a Slack message with the error text and module name.\\n\\n4 minutes to set up. Saves you from a client escalation at 9pm.",
      "accent_word": "4 minutes",
      "section_label": "After",
      "visual_type": "none"
    },
    {
      "text": "Want the Make.com error handling template I use on every client build?\\n\\nComment 'ERRORS' and I'll send it.",
      "accent_word": "ERRORS",
      "section_label": null,
      "visual_type": "cta_slide"
    }
  ],
  "caption": "Most Make.com automations fail in silence.\\n\\nHere's what that actually costs you:\\n\\n→ Why Make.com gives zero failure alerts by default\\n→ The 4-minute fix that protects every scenario\\n→ How to route errors to Slack instantly\\n→ The exact template I use on client builds\\n\\nComment ERRORS and I'll send you the blueprint 🔥\\n📌 Save this before you lose it\\n\\n#makecom #automation #nocode #aiautomation #workflow #simpliscale #thenickcornelius #agencyowner #solopreneur #productivity #businessautomation #entrepreneur #makecreator #aitools #zapier",
  "keyword": "ERRORS"
}

The example above is Make.com error handling — purely a format reference. IGNORE its structure and content.
Now write a completely original carousel about: "${topic}"`;

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
      // Normalize section_label: null/"null"/"none" → undefined; strip "Level X" prefix
      const rawLabel: string | null | undefined = s.section_label;
      const sectionLabel = (rawLabel && rawLabel !== 'null' && rawLabel !== 'none')
        ? rawLabel.replace(/^level\s+\d+\s*[:.]?\s*/i, '').trim() || undefined
        : undefined;
      // Ensure visual_type is a known value
      const vt = VALID_VISUAL_TYPES.has(s.visual_type) ? s.visual_type : 'none';
      return {
        ...s,
        text: cleanText,
        accent_word: fixAccentWord(cleanText, s.accent_word),
        section_label: sectionLabel,
        visual_type: vt,
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

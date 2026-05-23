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
    return `STYLE: "use_case_list" — Numbered examples. Each content slide = one real use case with a specific, concrete outcome. Labels: "01.", "02.", "Use Case 1", "Example 2".`;
  }
  if (style === 'prompt_reveal') {
    return `STYLE: "prompt_reveal" — Before/After or Myth-Busting. Build tension then flip it. Labels: "The Myth" / "Reality", "Before" / "After", "What you think" / "What actually happens".`;
  }
  return `STYLE: "tech_breakdown" — The structure comes from the topic's NATURAL SHAPE, not a template.

DECISION TREE — work through in order, pick the FIRST that fits perfectly:
1. Sequential process with ordered steps? (A → B → C) → STEPS
   Labels: "Step 1", "Step 2", "Step 3"…
2. List of separate unordered items? (tools, tips, prompts, examples) → NUMBERED LIST
   Labels: "01.", "02.", "03."…
3. Correcting a widespread false belief? → MYTH-BUSTING
   Labels: "The Myth", "Reality", "The Proof", "Apply It"…
4. Clear before/after transformation? → BEFORE/AFTER
   Labels: "Before", "After", "The Switch", "The Result"…
5. Explaining a hidden mechanism, concept, or system? → DEEP DIVE
   Labels: "What it is", "Why it matters", "How it works", "Real example", "Apply it today"…
6. Comparing two distinct options? → COMPARISON
   Labels: "Option A", "Option B", "The Verdict"…

CALIBRATION EXAMPLES — use these to pick your structure:
"Claude Code memory system" → DEEP DIVE (mechanism: what, why, how, example, apply)
"Make.com client onboarding automation" → STEPS (sequential: trigger → modules → test → live)
"Why 80% of AI agents fail in production" → MYTH-BUSTING (belief → reality → proof → fix)
"5 Claude prompts every agency owner needs" → NUMBERED LIST (01. → 05.)
"ChatGPT vs Claude for business writing" → COMPARISON (side A vs side B → verdict)

BANNED: "The Problem / The Fix" as a default structure — it flattens every topic into the same shape. Reserve it ONLY when the topic IS a pain-point story (e.g., "Why your automations fail silently at 3am"). Most topics are not.`;
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

// ─── Category-aware fallback carousel ─────────────────────────────────────────

type FallbackCategory = 'claude-code' | 'make-automation' | 'ai-agents' | 'business-ai';

const CATEGORY_FALLBACKS: Record<FallbackCategory, (topic: string, kw: string) => { slides: any[]; caption: string; keyword: string }> = {
  'claude-code': (topic, kw) => {
    const topicTitle = topic.trim();
    return {
      keyword: kw,
      slides: [
        { id: uid(), text: `${topicTitle}\n\n(the part most Claude Code users never figure out)`, accent_word: kw.toLowerCase(), visual_type: 'cover_photo', section_label: null, backgroundStatus: 'pending' },
        { id: uid(), text: `Claude Code has no persistent memory by default.\n\nEvery new session = blank slate. You re-explain your stack, your patterns, your constraints. Every. Single. Time.\n\nThat's 10-15 minutes of wasted setup on every session.`, accent_word: 'blank slate', section_label: 'What most people miss', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `CLAUDE.md is the foundation. One file in your project root.\n\nClaude reads it automatically at session start — no prompting needed. Your stack, your rules, your context. Loaded in seconds.`, accent_word: 'CLAUDE.md', section_label: 'How it actually works', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `What to put in CLAUDE.md:\n\n→ Your tech stack (exact versions)\n→ Naming conventions and patterns\n→ What NOT to touch\n→ Current goal or sprint context\n\n50 targeted words beats 1,000 words of re-explanation.`, accent_word: '50 words', section_label: 'The right content', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `After CLAUDE.md: session setup drops from 15 minutes to 0.\n\nClaude knows your codebase cold before you type a word.\n\nThat's 5+ hours back every week.`, accent_word: '5+ hours', section_label: 'The result', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `Want the full ${topicTitle} guide I use on every project?`, accent_word: 'guide', section_label: null, visual_type: 'cta_slide', backgroundStatus: 'pending' },
      ],
      caption: `Most Claude Code users never set this up — and it's costing them hours every week.\n\n→ Why sessions start from zero without it\n→ The file that changes everything (setup takes 5 minutes)\n→ Exactly what to put in it for maximum impact\n→ Real result: 5+ hours saved per week\n\nComment ${kw} and I'll send you the complete guide 🔥\n📌 Save this before you lose it\n\n#claudecode #claudeai #anthropic #aitools #coding #devtools #aideveloper #simpliscale #thenickcornelius #agencyowner #aiautomation #productivity #solopreneur #entrepreneurship #buildwithAI`,
    };
  },
  'make-automation': (topic, kw) => {
    const topicTitle = topic.trim();
    return {
      keyword: kw,
      slides: [
        { id: uid(), text: `${topicTitle}\n\n(and why most people build it wrong the first time)`, accent_word: kw.toLowerCase(), visual_type: 'cover_photo', section_label: null, backgroundStatus: 'pending' },
        { id: uid(), text: `Make.com scenarios fail with zero notification by default.\n\nTrigger fires. HTTP error. Data stops. No alert. No fallback.\n\nYour client's form submission goes nowhere while you sleep.`, accent_word: 'zero notification', section_label: 'The hidden problem', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `Add an Error Handler module after every HTTP request.\n\nRoute failures to a Slack message with the error text, module name, and timestamp.\n\n4 minutes to set up. Saves you from the 10pm client call.`, accent_word: '4 minutes', section_label: 'The fix', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `My error alert includes:\n\n→ Which scenario failed\n→ Which module threw the error\n→ The exact error message\n→ Timestamp so you can replay it\n\nOne Slack message = full context without digging.`, accent_word: 'full context', section_label: 'What the alert includes', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `Want the complete ${topicTitle} template I use on every client build?`, accent_word: 'template', section_label: null, visual_type: 'cta_slide', backgroundStatus: 'pending' },
      ],
      caption: `Most Make.com automations fail in silence. Here's what that costs you:\n\n→ Why Make gives zero failure alerts by default\n→ The 4-minute fix that protects every scenario\n→ How to route errors to Slack with full context\n→ The error handler template I use on every build\n\nComment ${kw} and I'll send you the template 🔥\n📌 Save this before you lose it\n\n#makecom #automation #nocode #aiautomation #workflow #simpliscale #thenickcornelius #agencyowner #solopreneur #productivity #businessautomation #entrepreneur #makecreator #aitools #zapier`,
    };
  },
  'ai-agents': (topic, kw) => {
    const topicTitle = topic.trim();
    return {
      keyword: kw,
      slides: [
        { id: uid(), text: `${topicTitle}\n\n(what nobody tells you before you build one)`, accent_word: kw.toLowerCase(), visual_type: 'cover_photo', section_label: null, backgroundStatus: 'pending' },
        { id: uid(), text: `Agents that try to do everything fail at everything.\n\nThe ones that work have exactly one job, 2-3 tools, and a clear output format.\n\nScope creep kills more agents than bad models.`, accent_word: 'one job', section_label: 'The core mistake', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `The right agent structure: Task → Tools → Loop → Output.\n\nTask: one specific deliverable.\nTools: read, write, notify — nothing else.\nLoop: scan, decide, act, repeat.\nOutput: structured JSON or plain English.`, accent_word: 'Task → Tools → Loop', section_label: 'The structure that works', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `Add a human checkpoint for any decision worth $50+.\n\nRoute it to Slack with context. Approve or reject in one click.\n\nThe agent resumes. No bottleneck. No lost deals.`, accent_word: '$50+', section_label: 'The safety layer', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `Want the complete ${topicTitle} guide I use on every deployment?`, accent_word: 'guide', section_label: null, visual_type: 'cta_slide', backgroundStatus: 'pending' },
      ],
      caption: `Most AI agents fail — and it's not the model's fault.\n\n→ The single reason 80% of agents fail in production\n→ The Task-Tools-Loop-Output structure that actually works\n→ How to add human approval without killing throughput\n→ The $50 rule for deciding when agents need oversight\n\nComment ${kw} and I'll send you the full setup guide 🔥\n📌 Save this before you lose it\n\n#aiagents #autonomousai #agenticai #claudeai #anthropic #aitools #simpliscale #thenickcornelius #agencyowner #automation #productivityhacks #entrepreneurship #buildwithAI #solopreneur #aiautomation`,
    };
  },
  'business-ai': (topic, kw) => {
    const topicTitle = topic.trim();
    return {
      keyword: kw,
      slides: [
        { id: uid(), text: `${topicTitle}\n\n(most owners are still doing this the slow way)`, accent_word: kw.toLowerCase(), visual_type: 'cover_photo', section_label: null, backgroundStatus: 'pending' },
        { id: uid(), text: `Most business owners use AI like a search engine.\n\nPaste a question. Read the answer. Move on.\n\nThat's 10% of what it can do. The other 90% runs your actual workflow.`, accent_word: '10%', section_label: 'The gap', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `The highest-ROI AI task isn't writing. It's decision support.\n\nFeed it your data. Ask it to find the pattern. Get the answer in 3 minutes instead of 3 hours.\n\nEvery owner I know who does this never goes back.`, accent_word: '3 minutes', section_label: 'The highest ROI use', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `My AI stack for running a $70k/month agency:\n\n→ Claude for writing, analysis, strategy\n→ Make.com for client workflow automation\n→ Claude Code for any custom tool\n\nTotal cost: under $200/month.`, accent_word: '$200/month', section_label: 'My actual stack', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `Want the complete ${topicTitle} implementation guide?`, accent_word: 'implementation', section_label: null, visual_type: 'cta_slide', backgroundStatus: 'pending' },
      ],
      caption: `Most business owners are using AI at 10% capacity.\n\n→ Why search-engine usage misses the entire point\n→ The highest-ROI AI application most owners haven't tried\n→ My exact AI stack for running a $70k/month agency\n→ What NOT to automate first (this surprises most people)\n\nComment ${kw} and I'll send you the full guide 🔥\n📌 Save this before you lose it\n\n#aitools #businessai #aiautomation #entrepreneurship #agencyowner #simpliscale #thenickcornelius #solopreneur #productivity #businessgrowth #aistrategy #chatgpt #anthropic #makecreator #scaleyourbusiness`,
    };
  },
};

// Pick the most impactful word or phrase from the topic for the cover accent.
// Priority: numbers/metrics → known tool names → longest meaningful word.
function coverAccentFromTopic(topic: string): string {
  const t = topic.trim();
  const numMatch = t.match(/\$[\d,]+[k]?|\b\d+(?:\.\d+)?[kx]?\b|\b\d+%/);
  if (numMatch) return numMatch[0];
  const toolMatch = t.match(/\b(?:Claude(?:\s+Code)?|Make\.com|n8n|Zapier|OpenAI|Gemini|ChatGPT|CLAUDE\.md|Anthropic)\b/i);
  if (toolMatch) return toolMatch[0];
  const stopWords = new Set(['the','a','an','how','to','of','in','for','with','and','or','your','my','why','what','when','its','that','this','these','those']);
  const words = t.split(/\s+/).filter(w => !stopWords.has(w.toLowerCase())).filter(w => w.length >= 4);
  return (words[1] || words[0] || t.split(/\s+/)[0]).replace(/[.,!?;:]$/, '');
}

function buildCategoryFallback(topic: string, category: string): { slides: any[]; caption: string; keyword: string; category: string } {
  const kw = fallbackKeyword(topic);
  const cat = (category in CATEGORY_FALLBACKS) ? category as FallbackCategory : 'business-ai';
  const result = CATEGORY_FALLBACKS[cat](topic, kw);
  // Patch cover slide accent word to be something that actually appears in the topic text
  const coverAccent = coverAccentFromTopic(topic);
  if (result.slides[0]) {
    result.slides[0] = { ...result.slides[0], accent_word: coverAccent };
  }
  return { ...result, category };
}

// If AI picks an accent_word that isn't in the slide text, extract the most impactful phrase.
// Priority: numbers+units → tool/file names → the proposed word (cleaned) → first strong noun.
function fixAccentWord(text: string, accentWord: string | undefined): string {
  if (!accentWord) return '';
  if (text.toLowerCase().includes(accentWord.toLowerCase())) return accentWord;
  // Numbers with units — most concrete, most screenshot-worthy
  const numMatch = text.match(/\$[\d,]+[k]?|\b\d+(?:\.\d+)?x\b|\b\d+(?:\s*(?:%|hrs?|hours?|min|minutes?|days?|weeks?|months?|seconds?|k))\b/i);
  if (numMatch) return numMatch[0].trim();
  // Tool/file names (CLAUDE.md, .json, /hooks, etc.)
  const toolMatch = text.match(/\b[A-Z][A-Z0-9]*\.(?:md|json|ts|js|py|sh|txt|yaml|toml)\b/);
  if (toolMatch) return toolMatch[0];
  // Named commands or paths (/hooks, /api/..., etc.)
  const cmdMatch = text.match(/\/[a-z][a-z_-]{2,}/);
  if (cmdMatch) return cmdMatch[0];
  // Fallback: first strong noun (>4 chars, not a stopword)
  const stop = new Set(['their', 'there', 'where', 'every', 'which', 'about', 'after', 'before', 'while', 'doing', 'using', 'start', 'build', 'when', 'from', 'that', 'with', 'your', 'have', 'more', 'this', 'just', 'most', 'also', 'than', 'then', 'what', 'into', 'over', 'them', 'they', 'some', 'never', 'always', 'still', 'right', 'first', 'second']);
  const words = text.split(/\s+/).filter(w => {
    const clean = w.replace(/[^a-zA-Z]/g, '').toLowerCase();
    return clean.length > 4 && !stop.has(clean);
  });
  const candidate = words[0] || accentWord;
  return candidate.replace(/[.,!?;:]$/, '');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic, style = 'tech_breakdown', research_context } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });

  const apiKey = process.env.GEMINI_API_KEY;
  const category = detectCategory(topic);

  const categoryHint: Record<string, string> = {
    'claude-code': `CATEGORY CONTEXT (claude-code): Use specific Claude Code terminology. Key concepts: CLAUDE.md (persistent memory file), /hooks (pre/post tool use), Claude Code CLI, claude-3-7-sonnet, tool_use blocks, system prompts, context window, session persistence. Mention exact file names, commands, or flags when relevant.`,
    'make-automation': `CATEGORY CONTEXT (make-automation): Use specific Make.com terminology. Key concepts: scenarios, modules, HTTP requests, webhooks, data stores, error handlers, routers, bundles, operations. Mention specific integrations (Slack, Notion, HubSpot, Airtable) by name.`,
    'ai-agents': `CATEGORY CONTEXT (ai-agents): Use specific AI agent terminology. Key concepts: orchestration, sub-agents, tool calls, context injection, handoff protocols, memory types (episodic/semantic), agent loops, multi-step tasks. Reference real frameworks: Claude, OpenAI, LangChain, AutoGPT.`,
    'business-ai': `CATEGORY CONTEXT (business-ai): Focus on measurable business outcomes. Use specific numbers (time saved, cost reduced, revenue increased). Reference real tools and workflows that agency owners actually use.`,
  };

  const prompt = `You are writing an Instagram carousel for Nick Cornelius (@thenickcornelius) — SimpliScale + KingCaller AI, $70K+/month. Audience: entrepreneurs and agency owners who use AI to scale.

TOPIC: "${topic}"
${categoryHint[category] ? `\n${categoryHint[category]}\n` : ''}${research_context?.full_research ? `\nRESEARCH:\n${research_context.full_research.slice(0, 2000)}` : ''}

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
Pick the phrase that delivers the BIGGEST punch — the stat, the tool name, the counter-intuitive fact.
Can be 1–3 words. Prefer specifics over abstractions.
  - Slide about cutting 3 hrs to 20 min → "3 hours"
  - Slide about CLAUDE.md → "CLAUDE.md"
  - Slide about a myth → the thing being busted (e.g. "never forgets")
  - Slide about a step → the tool or command (e.g. "git commit", "CLAUDE.md", "/api/imagen")
NOT: random adjectives, the slide title, a filler word, a word not in the text.

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

SLIDE COUNT — count from your structure, then add cover + CTA:
  Deep Dive with 5 phases → 7 slides total (cover + 5 content + CTA)
  Numbered list of 5 items → 7 slides total (cover + 5 items + CTA)
  3 myths to bust → 5 slides total (cover + 3 content + CTA)
  4-step process → 6 slides total (cover + 4 steps + CTA)
  Never pad slides. Never cut a structure short to hit a round number.
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
  text: ONE compelling question that flows naturally from the content. That's all.
    STOP after the question mark. Do NOT write "Comment X and I'll send you Y" —
    the slide template renders that automatically using the keyword field.
  visual_type: "cta_slide"
  section_label: null

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KEYWORD: max 8 chars, ALL CAPS, the single core concept
  Good: MEMORY, CLAUDE, AGENTS, HOOKS, SYSTEM, CONTEXT, BUILD, REVENUE, ERRORS, STACK
  Bad: LEARNAI, TIPS123, WORKFLOW2, CLICKME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAPTION — ready to paste into Instagram. Use \\n\\n for blank lines between sections.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[HOOK] ONE sentence. Stops scrolling. Reframes the topic unexpectedly. NOT the slide headline verbatim.
\\n\\n
[BULLETS] 3-5 lines each starting with → that tease the most surprising insight inside. Actual takeaways, not vague promises. Each line feels like a secret the reader doesn't know yet.
\\n\\n
Comment [KEYWORD] and I'll send you [exact deliverable — e.g. "the template", "the full setup guide", "the checklist"] 🔥
📌 Save this before you lose it
\\n\\n
[HASHTAGS] 10-15 on one line — must include #simpliscale #thenickcornelius #aitools

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMAT EXAMPLE — shows JSON structure ONLY. This example uses Deep Dive structure.
Yours may use a completely different structure. IGNORE topic and content below.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "slides": [
    {
      "text": "Most AI agents fail within 2 weeks of deployment\\n\\n(and it's never the model's fault)",
      "accent_word": "never the model's fault",
      "section_label": null,
      "visual_type": "cover_photo"
    },
    {
      "text": "An AI agent is a loop: perceive → decide → act → repeat. That's it.\\n\\nNot magic. Not sentience. A program that reads inputs, calls tools, and writes outputs — until a condition is met or a human stops it.",
      "accent_word": "perceive → decide → act",
      "section_label": "What it actually is",
      "visual_type": "none"
    },
    {
      "text": "Agents fail when scope is wrong, not when models are wrong.\\n\\nA GPT-4-level model with one clear task outperforms a frontier model with 12 vague tasks every time.\\n\\nScope is the architecture decision. Model is the implementation detail.",
      "accent_word": "one clear task",
      "section_label": "Why most fail",
      "visual_type": "none"
    },
    {
      "text": "My best-performing agent handles exactly one job: email triage. It reads, labels, drafts replies, and flags anything over $10K.\\n\\nIt's been running 6 months. Zero crashes. 3 tools. 200 lines of code.",
      "accent_word": "3 tools",
      "section_label": "Real example",
      "visual_type": "none"
    },
    {
      "text": "Start with the smallest useful task in your workflow — the one you do 10 times a day and hate.\\n\\nBuild the agent for that. Ship in a week. Add tasks only after it runs clean for 30 days.",
      "accent_word": "30 days",
      "section_label": "How to apply it",
      "visual_type": "none"
    },
    {
      "text": "Want the agent architecture template I use on every client deployment?",
      "accent_word": "architecture template",
      "section_label": null,
      "visual_type": "cta_slide"
    }
  ],
  "caption": "Most AI agents fail — and it's not because the models are bad.\\n\\nHere's what's actually going wrong:\\n\\n→ The perceive-decide-act loop every agent runs (it's simpler than you think)\\n→ Why scope kills more agents than bad models\\n→ A 3-tool agent that's been running flawlessly for 6 months\\n→ The 30-day rule before you add complexity\\n\\nComment AGENTS and I'll send you the full architecture template 🔥\\n📌 Save this before you lose it\\n\\n#aiagents #autonomousai #claude #anthropic #aitools #simpliscale #thenickcornelius #agencyowner #automation #buildwithAI",
  "keyword": "AGENTS"
}

The example above is AI agents with Deep Dive structure — purely a format reference. YOUR carousel must use whatever structure naturally fits "${topic}". Do NOT copy this structure.
Now write a completely original carousel about: "${topic}"`;

  if (!apiKey) {
    return res.json(buildCategoryFallback(topic, category));
  }

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: 8000 },
        thinkingConfig: { thinkingBudget: 0 },
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
    let caption = stripForbidden(parsed.caption || '');
    if (caption && !caption.includes('#simpliscale')) caption += ' #simpliscale';
    if (caption && !caption.includes('#thenickcornelius')) caption += ' #thenickcornelius';
    return res.json({ slides, caption, keyword, category });
  } catch (err) {
    console.error('Generate copy error:', err);
    // Fall back to high-quality category-specific content rather than erroring out
    return res.json({ ...buildCategoryFallback(topic, category), _fallback: true });
  }
}

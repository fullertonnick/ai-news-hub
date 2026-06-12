import type { NextApiRequest, NextApiResponse } from 'next';
import { stripForbidden, fixAccentWord, extractGeminiText, stripMarkdown } from '@/lib/carousel-lib';

export const config = { maxDuration: 60 };

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

const VALID_VISUAL_TYPES = new Set(['cover_photo', 'code_block', 'stats_grid', 'diagram', 'steps_list', 'skill_card', 'big_quote', 'comparison', 'checklist', 'cta_slide', 'none']);

function detectCategory(topic: string): string {
  const t = topic.toLowerCase();
  if (/claude(?!\s*van|\s*monet)/i.test(t) || /anthropic|mcp\b|claude code/.test(t)) return 'claude-code';
  if (/make\.com|n8n|zapier|integromat|workflow|automat|onboard/.test(t)) return 'make-automation';
  if (/\bagent\b|\bagents\b|multi.agent|autonomous|agentic/.test(t)) return 'ai-agents';
  return 'business-ai';
}

function styleHint(style: string): string {
  if (style === 'use_case_list') {
    return `STYLE: "use_case_list" — Numbered examples. Each content slide = one real use case with a specific, concrete outcome.
Labels: "01.", "02.", "03."…  (NOT "Step 1", NOT "Level 1" — just the number)
Each slide: name the use case → describe the setup in one line → show the concrete outcome with a number.
CALIBRATION EXAMPLES:
  "5 Claude prompts every agency owner needs" → 5 use case slides, each names one prompt, shows the setup, shows the result.
  "Make.com automations that save 10 hours/week" → 5 examples, each names the automation, describes what it connects, shows the time saved.`;
  }
  if (style === 'prompt_reveal') {
    return `STYLE: "prompt_reveal" — Myth-Busting OR Before/After. Pick the ONE that fits this topic:

MYTH-BUSTING (use when topic is about a common misconception or wrong belief):
  Labels: "The Myth", "The Reality", "The Proof", "The Fix"
  Flow: State the myth confidently (1 slide) → destroy it with specifics (1 slide) → prove it with a real example (1 slide) → show how to apply the correct belief (1 slide)
  GOOD for: "Why AI agents fail in production", "Why your Claude prompts stop working", "Why 80% of automations fail"

BEFORE/AFTER (use when topic is about a transformation or state change):
  Labels: "Before", "After", "What changed", "The result"
  Flow: Show the painful before state vividly → show the transformed after state → explain the exact mechanism that caused the change → show the measurable result
  GOOD for: "Claude Code with vs without CLAUDE.md", "My client onboarding before/after automation", "Running an agency before vs after AI"

CALIBRATION EXAMPLES:
  "Why most AI agents fail in production" → MYTH-BUSTING (The Myth: model is bad → Reality: scope is wrong → The Proof: 1-tool agent runs 6 months → Apply it)
  "Claude Code memory system" → NOT this style — use tech_breakdown (deep dive) instead
  "Life before vs after Make.com automation" → BEFORE/AFTER (Before: 3-hour manual process → After: 4 minutes → What changed: webhook + HTTP module → Result: 15 hours/week back)`;
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
"Claude Code memory system" → DEEP DIVE (hidden mechanism: What it is → Why it matters → How it works → Real example → Apply it)
"Claude Code hooks system" → STEPS (setup process: Step 1 install → Step 2 configure → Step 3 test → Step 4 deploy)
"Make.com client onboarding automation" → STEPS (workflow: Step 1 webhook → Step 2 validate → Step 3 create → Step 4 notify)
"Why 80% of AI agents fail in production" → MYTH-BUSTING (The Myth: model is bad → Reality: scope is wrong → The Proof → Apply It)
"5 Claude prompts every agency owner needs" → NUMBERED LIST (01. → 02. → 03. → 04. → 05.)
"ChatGPT vs Claude for business writing" → COMPARISON (Option A → Option B → The Verdict)
"My agency before and after switching to Claude Code" → BEFORE/AFTER (Before: slow → After: 4× faster → What changed → The result)

BANNED: "The Problem / The Fix" as a default structure — it flattens every topic into the same shape. Reserve it ONLY when the topic IS a pain-point story (e.g., "Why your automations fail silently at 3am"). Most topics are not.`;
}

function fallbackKeyword(topic: string): string {
  const t = topic.toLowerCase();
  // More specific matches first
  if (/memory|remember|context/.test(t)) return 'MEMORY';
  if (/hook/.test(t)) return 'HOOKS';
  if (/agent/.test(t)) return 'AGENTS';
  if (/prompt/.test(t)) return 'PROMPTS';
  if (/error|fail|debug/.test(t)) return 'ERRORS';
  if (/revenue|money|income/.test(t)) return 'REVENUE';
  if (/onboard/.test(t)) return 'ONBOARD';
  if (/make\.com|automat|workflow/.test(t)) return 'AUTOMATE';
  if (/claude code/.test(t)) return 'CLAUDE';
  if (/claude/.test(t)) return 'CLAUDE';
  if (/stack|tool/.test(t)) return 'STACK';
  if (/system/.test(t)) return 'SYSTEM';
  const stopWords = new Set(['THE', 'A', 'AN', 'HOW', 'TO', 'OF', 'IN', 'FOR', 'WITH', 'AND', 'OR', 'MY', 'YOUR', 'WHY', 'WHAT', 'WHEN']);
  const words = topic.toUpperCase().split(/\s+/).filter(w => !stopWords.has(w) && w.length >= 3);
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
        { id: uid(), text: `${topicTitle}\n\n(the part most Claude Code users never figure out)`, accent_word: kw.toLowerCase(), visual_type: 'cover_photo', backgroundStatus: 'pending' },
        { id: uid(), text: `Claude Code has no persistent memory by default.\n\nEvery new session = blank slate. You re-explain your stack, your patterns, your constraints. Every. Single. Time.\n\nThat's 10-15 minutes of wasted setup on every session.`, accent_word: 'blank slate', section_label: 'What most people miss', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `CLAUDE.md is the foundation. One file in your project root.\n\nClaude reads it automatically at session start — no prompting needed. Your stack, your rules, your context. Loaded in seconds.`, accent_word: 'CLAUDE.md', section_label: 'How it actually works', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `What to put in CLAUDE.md:\n\n→ Your tech stack (exact versions)\n→ Naming conventions and patterns\n→ What NOT to touch\n→ Current goal or sprint context\n\n50 targeted words beats 1,000 words of re-explanation.`, accent_word: '50 words', section_label: 'The right content', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `After CLAUDE.md: session setup drops from 15 minutes to 0.\n\nClaude knows your codebase cold before you type a word.\n\nThat's 5+ hours back every week.`, accent_word: '5+ hours', section_label: 'The result', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `Want the full ${topicTitle} guide I use on every project?`, accent_word: 'guide', visual_type: 'cta_slide', backgroundStatus: 'pending' },
      ],
      caption: `Most Claude Code users never set this up — and it's costing them hours every week.\n\n→ Why sessions start from zero without it\n→ The file that changes everything (setup takes 5 minutes)\n→ Exactly what to put in it for maximum impact\n→ Real result: 5+ hours saved per week\n\nComment ${kw} and I'll send you the complete guide 🔥\n📌 Save this before you lose it\n\n#claudecode #claudeai #anthropic #aitools #coding #devtools #aideveloper #simpliscale #thenickcornelius #agencyowner #aiautomation #productivity #solopreneur #entrepreneurship #buildwithAI`,
    };
  },
  'make-automation': (topic, kw) => {
    const topicTitle = topic.trim();
    return {
      keyword: kw,
      slides: [
        { id: uid(), text: `${topicTitle}\n\n(and why most people build it wrong the first time)`, accent_word: kw.toLowerCase(), visual_type: 'cover_photo', backgroundStatus: 'pending' },
        { id: uid(), text: `Make.com scenarios fail with zero notification by default.\n\nTrigger fires. HTTP error. Data stops. No alert. No fallback.\n\nYour client's form submission goes nowhere while you sleep.`, accent_word: 'zero notification', section_label: 'The hidden problem', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `Add an Error Handler module after every HTTP request.\n\nRoute failures to a Slack message with the error text, module name, and timestamp.\n\n4 minutes to set up. Saves you from the 10pm client call.`, accent_word: '4 minutes', section_label: 'The fix', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `My error alert includes:\n\n→ Which scenario failed\n→ Which module threw the error\n→ The exact error message\n→ Timestamp so you can replay it\n\nOne Slack message = full context without digging.`, accent_word: 'full context', section_label: 'What the alert includes', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `Want the complete ${topicTitle} template I use on every client build?`, accent_word: 'template', visual_type: 'cta_slide', backgroundStatus: 'pending' },
      ],
      caption: `Most Make.com automations fail in silence. Here's what that costs you:\n\n→ Why Make gives zero failure alerts by default\n→ The 4-minute fix that protects every scenario\n→ How to route errors to Slack with full context\n→ The error handler template I use on every build\n\nComment ${kw} and I'll send you the template 🔥\n📌 Save this before you lose it\n\n#makecom #automation #nocode #aiautomation #workflow #simpliscale #thenickcornelius #agencyowner #solopreneur #productivity #businessautomation #entrepreneur #makecreator #aitools #zapier`,
    };
  },
  'ai-agents': (topic, kw) => {
    const topicTitle = topic.trim();
    return {
      keyword: kw,
      slides: [
        { id: uid(), text: `${topicTitle}\n\n(what nobody tells you before you build one)`, accent_word: kw.toLowerCase(), visual_type: 'cover_photo', backgroundStatus: 'pending' },
        { id: uid(), text: `Agents that try to do everything fail at everything.\n\nThe ones that work have exactly one job, 2-3 tools, and a clear output format.\n\nScope creep kills more agents than bad models.`, accent_word: 'one job', section_label: 'The core mistake', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `The right agent structure: Task → Tools → Loop → Output.\n\nTask: one specific deliverable.\nTools: read, write, notify — nothing else.\nLoop: scan, decide, act, repeat.\nOutput: structured JSON or plain English.`, accent_word: 'Task → Tools → Loop', section_label: 'The structure that works', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `Add a human checkpoint for any decision worth $50+.\n\nRoute it to Slack with context. Approve or reject in one click.\n\nThe agent resumes. No bottleneck. No lost deals.`, accent_word: '$50+', section_label: 'The safety layer', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `Want the complete ${topicTitle} guide I use on every deployment?`, accent_word: 'guide', visual_type: 'cta_slide', backgroundStatus: 'pending' },
      ],
      caption: `Most AI agents fail — and it's not the model's fault.\n\n→ The single reason 80% of agents fail in production\n→ The Task-Tools-Loop-Output structure that actually works\n→ How to add human approval without killing throughput\n→ The $50 rule for deciding when agents need oversight\n\nComment ${kw} and I'll send you the full setup guide 🔥\n📌 Save this before you lose it\n\n#aiagents #autonomousai #agenticai #claudeai #anthropic #aitools #simpliscale #thenickcornelius #agencyowner #automation #productivityhacks #entrepreneurship #buildwithAI #solopreneur #aiautomation`,
    };
  },
  'business-ai': (topic, kw) => {
    const topicTitle = topic.trim();
    return {
      keyword: kw,
      slides: [
        { id: uid(), text: `${topicTitle}\n\n(most owners are still doing this the slow way)`, accent_word: kw.toLowerCase(), visual_type: 'cover_photo', backgroundStatus: 'pending' },
        { id: uid(), text: `Most business owners use AI like a search engine.\n\nPaste a question. Read the answer. Move on.\n\nThat's 10% of what it can do. The other 90% runs your actual workflow.`, accent_word: '10%', section_label: 'The gap', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `The highest-ROI AI task isn't writing. It's decision support.\n\nFeed it your data. Ask it to find the pattern. Get the answer in 3 minutes instead of 3 hours.\n\nEvery owner I know who does this never goes back.`, accent_word: '3 minutes', section_label: 'The highest ROI use', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `My AI stack for running a $70k/month agency:\n\n→ Claude for writing, analysis, strategy\n→ Make.com for client workflow automation\n→ Claude Code for any custom tool\n\nTotal cost: under $200/month.`, accent_word: '$200/month', section_label: 'My actual stack', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `Want the complete ${topicTitle} implementation guide?`, accent_word: 'implementation', visual_type: 'cta_slide', backgroundStatus: 'pending' },
      ],
      caption: `Most business owners are using AI at 10% capacity.\n\n→ Why search-engine usage misses the entire point\n→ The highest-ROI AI application most owners haven't tried\n→ My exact AI stack for running a $70k/month agency\n→ What NOT to automate first (this surprises most people)\n\nComment ${kw} and I'll send you the full guide 🔥\n📌 Save this before you lose it\n\n#aitools #businessai #aiautomation #entrepreneurship #agencyowner #simpliscale #thenickcornelius #solopreneur #productivity #businessgrowth #aistrategy #chatgpt #anthropic #makecreator #scaleyourbusiness`,
    };
  },
};

// Pick the most impactful phrase from the topic for the cover accent.
// Priority: numbers/metrics → concept after tool name → tool name → first strong noun.
function coverAccentFromTopic(topic: string): string {
  const t = topic.trim();
  const numMatch = t.match(/\$[\d,]+[k]?|\b\d+(?:\.\d+)?[kx]?\b|\b\d+%/);
  if (numMatch) return numMatch[0];
  // When topic is "Tool concept-words", prefer the concept part over the tool name.
  // e.g. "Claude Code memory system" → "memory system" beats "Claude Code"
  const toolRe = /\b(?:Claude(?:\s+Code)?|Make\.com|n8n|Zapier|OpenAI|Gemini|ChatGPT|CLAUDE\.md|Anthropic)\b/i;
  const toolMatch = t.match(toolRe);
  if (toolMatch) {
    const afterTool = t.slice(t.toLowerCase().indexOf(toolMatch[0].toLowerCase()) + toolMatch[0].length).trim();
    const stopWords = new Set(['the','a','an','how','to','of','in','for','with','and','or','your','my','why','what','when']);
    const conceptWords = afterTool.split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w.toLowerCase()));
    if (conceptWords.length >= 1) return conceptWords.slice(0, 2).join(' ').replace(/[.,!?;:]$/, '');
    return toolMatch[0]; // fallback: just the tool name
  }
  const stopWords = new Set(['the','a','an','how','to','of','in','for','with','and','or','your','my','why','what','when','its','that','this','these','those']);
  const words = t.split(/\s+/).filter(w => !stopWords.has(w.toLowerCase())).filter(w => w.length >= 4);
  return (words[0] || t.split(/\s+/)[0]).replace(/[.,!?;:]$/, '');
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic, style = 'tech_breakdown' } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });

  const apiKey = process.env.GEMINI_API_KEY;
  const category = detectCategory(topic);

  const categoryHint: Record<string, string> = {
    'claude-code': `CATEGORY CONTEXT (claude-code): Use specific, accurate Claude Code terminology.
Key concepts:
- CLAUDE.md: project memory file, read automatically at session start from project root or ~/.claude/CLAUDE.md
- .claude/settings.json: project-level permission and hook config
- /hooks: bash commands that run before/after specific tool calls (PreToolUse, PostToolUse, Stop)
- Claude Code CLI: runs as "claude" command in terminal
- Current models: claude-opus-4-8, claude-sonnet-4-6, claude-haiku-4-5-20251001
- Sessions start blank — CLAUDE.md is the ONLY persistence mechanism by default
- Context window: ~200K tokens; compaction happens automatically when approaching limit
- Tool use: Bash, Read, Edit, Write, Agent are the core tools Claude Code uses
Name exact file paths, commands, and flags. Never say "a config file" — say "CLAUDE.md".`,
    'make-automation': `CATEGORY CONTEXT (make-automation): Use specific Make.com terminology.
Key concepts: scenarios, modules, HTTP request modules, webhooks, data stores, error handler routes, routers, bundles/collections, operations count, instant triggers vs scheduled.
Name real integrations: Slack, Notion, HubSpot, Airtable, Gmail, Google Sheets.
Name specific error types: mapping errors, connection errors, rate limits, timeouts.
Mention real Make.com UX details: scenario builder, module config panels, run history, bundle inspector.`,
    'ai-agents': `CATEGORY CONTEXT (ai-agents): Use specific, accurate AI agent terminology.
Key concepts: agent loops (perceive → plan → act → observe), tool calls, context injection, system prompts, handoff between agents, memory types (short-term: context window; long-term: vector DB or files).
Real frameworks to reference: Claude's native tool use, LangGraph, CrewAI, AutoGen, n8n AI nodes.
Common failure modes: scope creep, tool hallucination, infinite loops, context window exhaustion.
Real-world details: token cost per agent run, latency per tool call, error recovery patterns.`,
    'business-ai': `CATEGORY CONTEXT (business-ai): Focus on measurable business outcomes for agency owners and entrepreneurs.
Use specific numbers: time saved in hours per week, cost in $/month, revenue impact in $/month.
Name real tools: Claude, ChatGPT, Make.com, n8n, Zapier, Notion, Slack, HubSpot, Airtable.
Reference Nick's context: $70K+/month agency, SimpliScale, KingCaller AI, solopreneur/small team workflows.
Avoid generic "AI helps your business" — always tie to a specific workflow, role, or dollar amount.`,
  };

  const prompt = `You are writing an Instagram carousel for Nick Cornelius (@thenickcornelius) — SimpliScale + KingCaller AI, $70K+/month. Audience: entrepreneurs and agency owners who use AI to scale.

TOPIC: "${topic}"
${categoryHint[category] ? `\n${categoryHint[category]}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 0 — DECIDE STRUCTURE FIRST (do this before writing a single slide)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ask yourself: what is the natural shape of this topic?
- Is it a sequential process? → STEPS ("Step 1", "Step 2"…)
- Is it a list of separate examples/tools? → NUMBERED LIST ("01.", "02."…)
- Does it correct a false belief? → MYTH-BUSTING ("The Myth", "Reality", "The Proof")
- Is it a clear transformation? → BEFORE/AFTER ("Before", "After", "What changed")
- Is it explaining a hidden mechanism? → DEEP DIVE ("What it is", "Why it matters", "How it works", "Real example", "Apply it")
- Is it comparing two options? → COMPARISON ("Option A", "Option B", "The Verdict")

Pick ONE. Lock it in. Write ALL slides using that structure's labels.
NEVER use "Level 1", "Level 2", "Beginner", "Intermediate", "Advanced" — ever.

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
- FORBIDDEN WORDS: leverage, utilize, synergy, game-changer, seamless, empower,
  unlock, revolutionize, supercharge, innovative, paradigm, delve, streamline,
  robust, harness, actionable, skyrocket, next-level, disruptive, cutting-edge.
- Concrete: "Claude reads your repo in 15s" NOT "AI understands your codebase"
- Numbers beat adjectives: "saves 3 hours" beats "saves significant time"
- Name the actual thing: "CLAUDE.md" beats "a config file", "$200/month" beats "affordable"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCENT WORD — highlighted orange, one per slide
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE: accent_word MUST appear verbatim (exact substring) in the slide text, case-insensitive.
Pick the phrase that delivers the BIGGEST punch — the stat, the tool name, the counter-intuitive fact.
Can be 1–4 words. Prefer specifics over abstractions. SHORT is better than LONG.

PRIORITY ORDER (use the first one that exists in your slide):
  1. Numbers with dollar amounts: "$200/month", "$70k", "5+ hours"
  2. Numbers with units: "3 minutes", "4x faster", "15 seconds", "30 days"
  3. Tool/command/file names: "CLAUDE.md", "/hooks", "git commit", "Make.com"
  4. Arrow sequences (the kicker mechanism): "perceive → decide → act", "A → B → C"
  5. The counter-intuitive claim: "blank slate", "never forgets", "one job"
  6. The most concrete noun in the last sentence (kicker)

BAD accent words (never use these):
  - Generic: "today", "powerful", "great", "better", "simple", "easy"
  - Adjectives: "effective", "efficient", "important", "useful"
  - The section_label (e.g., don't repeat "Step 1" as the accent word)
  - Any word NOT in the slide text

CRITICAL — do this AFTER writing each slide's text, NOT before:
  1. Re-read the slide text.
  2. Find the single phrase a reader would screenshot.
  3. Confirm that exact phrase is in the text.
  4. Set that as accent_word.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${styleHint(style)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRUCTURE — pick ONE that best fits this specific topic:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HARD BAN: "Level 1, Level 2, Level 3..." — this is never allowed under any circumstances.
HARD BAN: "Beginner / Intermediate / Advanced" — same reason, never use.
AVOID: "The Problem / The Fix" — only use when the topic IS literally a pain/solution story.

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
  text: Hook headline (5-8 words, reveals tension or counter-intuitive fact) +
        "\\n\\n(subtitle: specific payoff — lowercase, one line, what reader walks away with)"
  STRONG COVERS:
    "Claude Code forgets your entire stack between sessions\\n\\n(the 5-minute CLAUDE.md fix that changes this forever)"
    "Most AI agents fail within 2 weeks of deployment\\n\\n(it's never the model's fault)"
    "Make.com scenarios fail in silence by default\\n\\n(here's the 4-minute error handler that ends midnight alerts)"
    "Your Claude Code sessions start from zero every single time\\n\\n(one file in your project root fixes this permanently)"
  WEAK COVERS (avoid):
    "How to use Claude Code\\n\\n(tips and tricks)" ← vague, no tension, no payoff
    "Claude Code memory system\\n\\n(a guide to memory)" ← no tension, no specific payoff
  visual_type: "cover_photo"
  section_label: null
  accent_word: pick the TENSION phrase — the counter-intuitive claim, the surprising number, or the specific mechanism.
    The accent_word must NOT be the topic name or a word anyone would predict. It should be the phrase that makes the reader pause.
    GOOD cover accents: "never the model's fault", "fail in silence", "blank slate", "5-minute fix", "from one file"
    BAD cover accents: "Claude Code", "AI agents", "automation", "memory system" (topic name fragments — too predictable)

SLIDES 2 to N-1 (CONTENT):
  text: 2-4 punchy sentences. One key insight. Last line = the kicker.
  KICKER RULE: Final sentence reframes everything above it. Short. Punchy. Changes how they see the topic.
    GOOD kickers: "Scope is the architecture. Model is the detail."
                  "5+ hours back. Every week. From one file."
                  "The tool didn't fail. The scope did."
    BAD kickers: "This is a very powerful approach." / "Consider applying this today." (no punch, no reframe)
  visual_type: Use "none" for pure text slides (most cases — Tyler Germain text-first style).
    Exception: if the slide IS a list of steps/items where visuals add clarity, use "steps_list".
    Exception: if the slide IS a direct before/after, use "comparison".
    Exception: if the slide IS a checklist, use "checklist".
    Never use visual types just to fill space — only when the slide content IS that structure.
  section_label: the label from your chosen structure (e.g. "Step 1", "01.", "The Myth", "Before", "What it is") — or null if none needed

LAST SLIDE (CTA):
  text: ONE compelling question that flows naturally from the content. STOP after the question mark.
    Do NOT write "Comment X and I'll send you Y" — the slide template renders that from keyword.
    The question should make the reader think "yes, I need that right now."
  STRONG CTA questions:
    "Want the exact CLAUDE.md template I use on every project?"
    "Ready to stop re-explaining your stack every Claude Code session?"
    "Want the Make.com error handler template that's saved 50+ client builds?"
    "Ready to build your first real AI agent this weekend?"
  WEAK CTA questions (avoid):
    "Want to learn more about this?" ← too vague
    "Interested in AI tools?" ← no connection to the carousel content
  visual_type: "cta_slide"
  section_label: null

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KEYWORD: max 8 chars, ALL CAPS, the single core concept that makes a great DM trigger
  Pick what people will actually want to comment to unlock the offer.
  Good: MEMORY, CLAUDE, AGENTS, HOOKS, SYSTEM, CONTEXT, BUILD, REVENUE, ERRORS, STACK
  Bad: LEARNAI, TIPS123, WORKFLOW2, CLICKME, TIPS, MORE, GUIDE
  Rule: if topic is about a specific tool, name the tool. If it's about a concept, name the concept.
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
BEFORE GENERATING JSON — run this checklist mentally:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Did I pick ONE structure that fits this topic naturally (not just "the default")?
□ Does the cover headline reveal tension or a counter-intuitive fact?
□ Does every content slide pass all 3 Bullshit Test criteria?
□ Is the last sentence of each content slide a punchy kicker?
□ Does every accent_word appear verbatim in its slide's text?
□ Does the CTA question feel like the punchline of the whole carousel?
□ Does the caption tease surprising insights (not just restate slide headlines)?
□ Is the keyword ≤8 chars, ALL CAPS, and would a reader actually comment it?
□ Does the keyword appear in the caption's "Comment X and I'll send you..." line?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMAT EXAMPLE — shows JSON structure ONLY. This example uses STEPS structure.
Yours may use a completely different structure. IGNORE topic and content below.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "slides": [
    {
      "text": "Make.com scenarios fail in silence by default\\n\\n(this 4-minute fix ends the midnight client alerts)",
      "accent_word": "fail in silence",
      "section_label": null,
      "visual_type": "cover_photo"
    },
    {
      "text": "Every HTTP module can throw an error with zero notification.\\n\\nYour scenario stops. Data disappears. No Slack ping. No email. Nothing.\\n\\nYour client notices before you do.",
      "accent_word": "zero notification",
      "section_label": "Step 1",
      "visual_type": "none"
    },
    {
      "text": "Add an Error Handler route after every HTTP module — not just the last one.\\n\\nPipe the failure to Slack: scenario name, module number, error text, timestamp.\\n\\n4 minutes to build. Your on-call schedule shrinks to zero.",
      "accent_word": "4 minutes",
      "section_label": "Step 2",
      "visual_type": "none"
    },
    {
      "text": "Log every failure to a Make Data Store: date, scenario ID, error code, bundle data.\\n\\nNow you have a searchable audit trail instead of a Slack message you'll scroll past.\\n\\nClients stop asking 'what happened' — because you already know.",
      "accent_word": "audit trail",
      "section_label": "Step 3",
      "visual_type": "none"
    },
    {
      "text": "Add a retry filter: if the error is a 5xx or timeout (not a 4xx), wait 30 seconds and re-run.\\n\\n90% of transient failures self-resolve without human intervention.\\n\\n4xx errors are data problems — those go straight to the alert, no retry.",
      "accent_word": "90%",
      "section_label": "Step 4",
      "visual_type": "none"
    },
    {
      "text": "Want the Make.com error handler blueprint I use on every client build?",
      "accent_word": "error handler blueprint",
      "section_label": null,
      "visual_type": "cta_slide"
    }
  ],
  "caption": "Most Make.com automations fail silently. Here's the 4-minute fix that ends midnight alerts.\\n\\n→ Why HTTP modules fail with zero notification by default\\n→ The Slack alert setup that tells you exactly what broke and when\\n→ Data Store logging for a full searchable audit trail\\n→ The retry logic that auto-resolves 90% of transient errors\\n\\nComment ERRORS and I'll send you the complete error handler blueprint 🔥\\n📌 Save this before you lose it\\n\\n#makecom #automation #nocode #aiautomation #simpliscale #thenickcornelius #agencyowner #workflow #makecreator #automateyourbusiness",
  "keyword": "ERRORS"
}

The example above is Make.com error handling with STEPS structure — purely a format reference. YOUR carousel must use whatever structure naturally fits "${topic}". Do NOT copy this structure.
Now write a completely original carousel about: "${topic}"`;

  if (!apiKey) {
    return res.json(buildCategoryFallback(topic, category));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: 8192 },
        thinkingConfig: { thinkingBudget: 8000 },
      }),
    });
    const d = await r.json();
    let text = extractGeminiText(d);
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) text = fenceMatch[1];
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];
    const parsed = JSON.parse(text.trim());

    const slides = (parsed.slides || []).map((s: any, idx: number) => {
      let rawText = s.text || '';
      const isLastSlide = idx === (parsed.slides || []).length - 1;
      // CTA slide: strip any "Comment X and I'll send you Y" the AI adds — the slide template renders it from keyword
      if (isLastSlide || s.visual_type === 'cta_slide') {
        rawText = rawText.replace(/\s*\n*Comment\s+\w+\s+and\s+I['']ll\s+send[\s\S]*/i, '').trim();
        rawText = rawText.replace(/\s*\n*Drop\s+["']?\w+["']?\s+in\s+the\s+comments?[\s\S]*/i, '').trim();
        rawText = rawText.replace(/\s*\n*Comment\s+["']?\w+["']?\s+below[\s\S]*/i, '').trim();
      }
      // Strip "Level X:" and "Beginner/Intermediate/Advanced:" prefixes — AI sometimes ignores the ban
      rawText = rawText.replace(/^Level\s+\d+\s*[:.\s—–]+/gim, '').trim();
      rawText = rawText.replace(/^(?:Beginner|Intermediate|Advanced)\s*[:.\s—–]+/gim, '').trim();
      rawText = stripMarkdown(rawText);
      const cleanText = stripForbidden(rawText);
      // Normalize section_label: null/"null"/"none" → undefined; strip "Level X" prefix
      const rawLabel: string | null | undefined = s.section_label;
      const sectionLabel = (rawLabel && rawLabel !== 'null' && rawLabel !== 'none')
        ? rawLabel
            .replace(/^level\s+\d+\s*[:.]?\s*/i, '')
            .replace(/^(?:beginner|intermediate|advanced)\s*[:.]?\s*/i, '')
            .trim() || undefined
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

    // Enforce slide count: fall back if AI returns too few or too many
    if (slides.length < 5) {
      console.warn(`generate-copy: only ${slides.length} slides returned — falling back`);
      return res.json({ ...buildCategoryFallback(topic, category), _fallback: true });
    }
    // Cap at 10 (keep cover + up to 8 content + CTA)
    let finalSlides = slides.length > 10
      ? [slides[0], ...slides.slice(1, -1).slice(0, 8), slides[slides.length - 1]]
      : slides;

    // Ensure first slide is cover_photo and last is cta_slide
    if (finalSlides[0]?.visual_type !== 'cover_photo') {
      finalSlides[0] = { ...finalSlides[0], visual_type: 'cover_photo' };
    }
    if (finalSlides[finalSlides.length - 1]?.visual_type !== 'cta_slide') {
      finalSlides[finalSlides.length - 1] = { ...finalSlides[finalSlides.length - 1], visual_type: 'cta_slide' };
    }

    const rawKw = (parsed.keyword || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    const keyword = rawKw.length >= 2 ? rawKw : fallbackKeyword(topic);
    // Strip markdown and forbidden words from caption — AI occasionally emits **bold** in captions
    let caption = stripForbidden(stripMarkdown(parsed.caption || ''));
    // Ensure the caption uses the resolved keyword
    caption = caption.replace(/Comment\s+[A-Z0-9]+\s+and/gi, `Comment ${keyword} and`);
    // Ensure the CTA line exists before hashtags
    if (caption && !/comment\s+[A-Z0-9]+/i.test(caption)) {
      const hashtagIdx = caption.indexOf('#');
      const ctaLine = `Comment ${keyword} and I'll send it over 🔥\n📌 Save this before you lose it`;
      caption = hashtagIdx >= 0
        ? caption.slice(0, hashtagIdx).trimEnd() + '\n\n' + ctaLine + '\n\n' + caption.slice(hashtagIdx)
        : caption.trimEnd() + '\n\n' + ctaLine;
    }
    // Ensure "📌 Save this" line exists
    if (caption && !caption.includes('📌') && !caption.includes('Save this')) {
      const hashtagIdx = caption.indexOf('#');
      const saveLine = '📌 Save this before you lose it';
      caption = hashtagIdx >= 0
        ? caption.slice(0, hashtagIdx).trimEnd() + '\n' + saveLine + '\n\n' + caption.slice(hashtagIdx)
        : caption.trimEnd() + '\n' + saveLine;
    }
    if (caption && !caption.includes('#simpliscale')) caption += '\n\n#simpliscale #thenickcornelius';
    else if (caption && !caption.includes('#thenickcornelius')) caption += ' #thenickcornelius';
    return res.json({ slides: finalSlides, caption, keyword, category, _fallback: false });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.error('Generate copy: Gemini request timed out');
    } else {
      console.error('Generate copy error:', err);
    }
    return res.json({ ...buildCategoryFallback(topic, category), _fallback: true });
  } finally {
    clearTimeout(timeout);
  }
}

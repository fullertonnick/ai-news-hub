import type { NextApiRequest, NextApiResponse } from 'next';

// ─── Forbidden Words ──────────────────────────────────────────────────────────

const FORBIDDEN: Record<string, string> = {
  'leverage': 'use', 'utilize': 'use', 'synergy': 'teamwork',
  'game-changer': 'breakthrough', 'revolutionary': 'new',
  'paradigm': 'approach', 'disruptive': 'new', 'cutting-edge': 'modern',
  'innovative': 'effective',
};

function replaceForbidden(text: string): string {
  let r = text;
  for (const [bad, good] of Object.entries(FORBIDDEN)) {
    r = r.replace(new RegExp(`\\b${bad}\\b`, 'gi'), good);
  }
  return r;
}

function truncateWords(text: string, max = 40): string {
  const words = text.split(/\s+/).filter(Boolean);
  return words.length > max ? words.slice(0, max).join(' ') + '...' : text;
}

// ─── Category Detection ───────────────────────────────────────────────────────

function detectCategory(topic: string): string {
  const t = topic.toLowerCase();
  if (/claude(?!\s*van|\s*monet|\s*de|\s*le)/i.test(t) || /anthropic|mcp\b|claude code/.test(t)) return 'claude-code';
  if (/make\.com|\bmake\b|n8n|zapier|integromat|workflow|automat|onboard/.test(t)) return 'make-automation';
  if (/\bagent\b|\bagents\b|multi.agent|autonomous|agentic/.test(t)) return 'ai-agents';
  return 'business-ai';
}

// ─── Deterministic Hash ───────────────────────────────────────────────────────

function hashTopic(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

// ─── Smart Keyword Extraction (Bonus Fix 2) ───────────────────────────────────

const KW_STOP = new Set([
  'WILL', 'HOW', 'THE', 'WHAT', 'WHY', 'IS', 'ARE', 'WAS', 'BE',
  'A', 'AN', 'TO', 'FOR', 'AND', 'OR', 'OF', 'IN', 'ON', 'WITH',
  'THAT', 'THIS', 'CAN', 'DOES', 'DO', 'AS', 'BY', 'AT', 'FROM',
  'INTO', 'OUT', 'UP', 'ABOUT', 'USING', 'USE', 'YOUR', 'MY', 'IT',
  'ITS', 'THEIR', 'OUR', 'WE', 'YOU', 'I', 'HE', 'SHE', 'THEY',
  'REPLACE', 'REPLACING', 'MANUAL', 'DATA', 'WHEN', 'WERE', 'HAVE',
]);

function generateKeyword(topic: string, category: string): string {
  const t = topic.toLowerCase();
  // Tool name exact matches (highest priority)
  if (/claude/.test(t)) return 'CLAUDE';
  if (/make\.com|\bmake\b/.test(t)) return 'MAKE';
  if (/\bn8n\b/.test(t)) return 'N8N';
  if (/zapier/.test(t)) return 'ZAPIER';
  if (/chatgpt/.test(t)) return 'CHATGPT';
  if (/openai/.test(t)) return 'OPENAI';
  if (/gemini/.test(t)) return 'GEMINI';
  if (/notion/.test(t)) return 'NOTION';
  if (/airtable/.test(t)) return 'AIRTABLE';
  if (/cursor/.test(t)) return 'CURSOR';
  if (/perplexity/.test(t)) return 'PERPLEXITY';
  if (/midjourney/.test(t)) return 'MIDJOURNEY';
  if (/\bagent\b/.test(t)) return 'AGENT';
  if (/automat/.test(t)) return 'AUTOMATE';
  if (/workflow/.test(t)) return 'WORKFLOW';
  if (/onboard/.test(t)) return 'ONBOARD';
  if (/memory/.test(t)) return 'MEMORY';
  if (/revenue/.test(t)) return 'REVENUE';
  if (/scale/.test(t)) return 'SCALE';
  // Pick first non-stop meaningful word ≤8 chars
  const words = topic.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/);
  const meaningful = words.find(w => {
    const u = w.toUpperCase();
    return w.length >= 3 && w.length <= 8 && !KW_STOP.has(u);
  });
  if (meaningful) return meaningful.toUpperCase();
  // Category fallback
  const map: Record<string, string> = {
    'claude-code': 'CLAUDE', 'make-automation': 'AUTOMATE',
    'ai-agents': 'AGENT', 'business-ai': 'SCALE',
  };
  return map[category] || 'AUTOMATE';
}

// ─── CTA Headline by Category (Bonus Fix 1) ───────────────────────────────────

function generateCTAHeadline(category: string): string {
  const map: Record<string, string> = {
    'claude-code':      'Want the Full Prompt Pack?',
    'make-automation':  'Want the Complete Blueprint?',
    'ai-agents':        'Want the Full Setup Guide?',
    'business-ai':      'Want the Full Implementation Guide?',
  };
  return map[category] || 'Want the Full Implementation Guide?';
}

function generateLeadMagnetText(category: string): string {
  const map: Record<string, string> = {
    'claude-code':      'full Claude Code setup guide',
    'make-automation':  'complete automation blueprint',
    'ai-agents':        'full agent setup guide',
    'business-ai':      'complete implementation guide',
  };
  return map[category] || 'complete guide';
}

// ─── Fix C: Gradient Hue (deterministic, unique per topic) ───────────────────

function generateGradientHue(slug: string): number {
  const h = hashTopic(slug.toLowerCase());
  // 6 visually distinct hue zones — avoids putting everyone on orange
  const zones = [210, 250, 280, 160, 320, 30]; // blue, indigo, purple, teal, pink, amber
  return zones[h % zones.length];
}

// ─── Cover Headline (formula-driven, tool-aware) ──────────────────────────────

function pickCoverHeadline(topic: string, category: string, hash: number): string {
  const t = topic.toLowerCase();
  if (/claude/.test(t)) return 'Stop Guessing. Claude Handles It Instantly.';
  if (/make\.com|\bmake\b/.test(t)) return 'The Make Blueprint That Saves 20 hrs/wk';
  if (/\bn8n\b/.test(t)) return '5 n8n Workflows That Replace Your VA';
  if (/zapier/.test(t)) return 'Stop Paying for Tasks Zapier Does Free';
  if (/chatgpt/.test(t)) return 'The ChatGPT System That Runs Your Business';
  if (/cursor/.test(t)) return 'Ship Code 5x Faster Using Cursor Today';
  if (/prompt/.test(t)) return 'The Exact Prompt Framework That Changes Everything';
  if (/automat/.test(t)) return 'Stop Doing It Manually. AI Runs It Now.';
  if (/workflow/.test(t)) return '5 Workflow Changes That Save 30 hrs/wk';
  if (/onboard/.test(t)) return 'How AI Automates Client Onboarding Completely';
  if (/data entry/.test(t)) return 'How AI Eliminates Manual Data Entry Forever';
  if (/\bagent\b/.test(t)) return 'The AI Agent System Nobody Is Talking About';
  if (/report/.test(t)) return 'Cut Reporting Time by 90% With AI';
  if (/memory/.test(t)) return 'The Memory System That Makes AI Unstoppable';
  if (/cost|revenue|roi/.test(t)) return 'How I Cut Costs 80% Using AI Alone';
  // Hash-seeded variety for generic topics
  const templates = [
    'Stop Working Manually. AI Does It Faster.',
    'The AI System That Pays for Itself Daily',
    '5 AI Moves That Build Real Business Revenue',
    'How I Cut Costs 80% Using AI Alone',
    'The Automation System Nobody Is Talking About',
    'Why Your Competitors Are Pulling Ahead Fast',
  ];
  return templates[hash % templates.length];
}

function pickCoverAccentWord(headline: string): string {
  // Priority accent words — these are high-impact and visually interesting
  const priority = ['Instantly', 'Blueprint', 'Agent', 'Nobody', 'Exact', 'Free', 'Forever', 'Completely', 'Faster', 'Unstoppable', 'Eliminate', 'System', 'Automates', 'Claude', 'Make'];
  const words = headline.split(/\s+/);
  for (const p of priority) {
    const found = words.find(w => w.replace(/[^a-zA-Z]/g, '').toLowerCase() === p.toLowerCase());
    if (found) return found.replace(/[^a-zA-Z]/g, '');
  }
  // Fallback: longest word in headline (usually most impactful)
  return words.reduce((a, b) => b.replace(/[^a-zA-Z]/g, '').length > a.replace(/[^a-zA-Z]/g, '').length ? b : a, words[1] || words[0]).replace(/[^a-zA-Z]/g, '');
}

// ─── Topic-Specific Stats (Fix B + Fix E) ────────────────────────────────────

interface StatItem { icon: string; value: string; label: string; }

type CategoryKey = 'claude-code' | 'make-automation' | 'ai-agents' | 'business-ai';

const STAT_RANGES: Record<CategoryKey, { time: [number, number]; speed: [number, number]; cost: [number, number]; daysMin: number; daysMax: number; daysUnit: string }> = {
  'claude-code':     { time: [8, 25],  speed: [3, 10],  cost: [40, 80], daysMin: 1, daysMax: 3,  daysUnit: 'days' },
  'make-automation': { time: [10, 30], speed: [5, 15],  cost: [50, 85], daysMin: 3, daysMax: 7,  daysUnit: 'days' },
  'ai-agents':       { time: [15, 40], speed: [8, 20],  cost: [60, 90], daysMin: 1, daysMax: 2,  daysUnit: 'wks' },
  'business-ai':     { time: [5, 20],  speed: [2, 8],   cost: [30, 70], daysMin: 2, daysMax: 4,  daysUnit: 'wks' },
};

function pickInRange(hash: number, min: number, max: number): number {
  return min + (hash % (max - min + 1));
}

function generateTopicStats(topic: string, category: string, baseHash: number, research: any): StatItem[] {
  // Priority 1: extract real metrics from research if they look specific
  if (research?.metrics?.length >= 4) {
    // research.metrics are strings like "Hours saved per week" — use as labels with seeded values
    // Only use this path if metrics look non-generic
    const isSpecific = research.metrics.some((m: string) => /\d/.test(m));
    if (isSpecific) {
      // Has actual numbers — use them (rare without Gemini, but possible)
    }
  }

  const cat = (STAT_RANGES[category as CategoryKey] || STAT_RANGES['business-ai']);
  // Use 4 different hash seeds per stat slot for variety
  const h1 = baseHash;
  const h2 = hashTopic(topic + '_speed');
  const h3 = hashTopic(topic + '_cost');
  const h4 = hashTopic(topic + '_days');

  const timeVal = pickInRange(h1, cat.time[0], cat.time[1]);
  const speedVal = pickInRange(h2, cat.speed[0], cat.speed[1]);
  const costVal = Math.round(pickInRange(h3, cat.cost[0], cat.cost[1]) / 5) * 5; // nearest 5%
  const daysVal = pickInRange(h4, cat.daysMin, cat.daysMax);

  return [
    { icon: '⏱',  value: `${timeVal} hrs`,        label: 'SAVED PER WEEK' },
    { icon: '📈',  value: `${speedVal}x`,           label: 'FASTER THAN MANUAL' },
    { icon: '💰',  value: `${costVal}%`,            label: 'LOWER DELIVERY COST' },
    { icon: '🚀',  value: `${daysVal} ${cat.daysUnit}`, label: 'TO SEE RESULTS' },
  ];
}

// ─── Topic-Specific Steps (Fix B) ─────────────────────────────────────────────

const CATEGORY_STEPS: Record<CategoryKey, { title: string; desc: string }[]> = {
  'claude-code': [
    { title: 'Set up your Claude Code memory file',     desc: 'Create CLAUDE.md in your project root — 3 lines of context is enough to start' },
    { title: 'Write your first agentic command',         desc: 'Give Claude a task with file read+write access. Watch it loop until done.' },
    { title: 'Measure output quality after 5 sessions', desc: 'Compare code speed and error rate. Expect 40-60% faster delivery in week 1.' },
  ],
  'make-automation': [
    { title: 'Map your most repeated client workflow',   desc: 'Pick one workflow done 3+ times per week — report, proposal, or onboarding' },
    { title: 'Build the trigger and first 3 modules',    desc: 'Start with webhook → transform data → output to Sheets or email. Under 2 hrs.' },
    { title: 'Run it live with one test client first',   desc: 'Use a real scenario but with cloned data. Fix edge cases before you scale.' },
  ],
  'ai-agents': [
    { title: 'Define the one task your agent handles',   desc: 'Agents fail when given too much scope — one clear objective per agent' },
    { title: 'Build the tool loop: scan → decide → act', desc: 'Give the agent 2-3 tools max. More tools = more failure modes.' },
    { title: 'Add a human checkpoint for edge cases',    desc: 'Any decision with $$ attached should route to Slack or email for approval.' },
  ],
  'business-ai': [
    { title: 'Audit your weekly hours by task type',     desc: 'Use a simple spreadsheet — 2 days of data reveals your biggest time drains' },
    { title: 'Pick your highest-ROI automation first',   desc: 'Repeating tasks with clear inputs/outputs and no judgment calls = perfect fit' },
    { title: 'Track results weekly for the first month', desc: 'Time saved + cost per deliverable before/after. The numbers will compound.' },
  ],
};

function isGenericResearch(research: any): boolean {
  if (!research?.roadmap?.length) return true;
  // The generic fallback always starts with this exact string
  return research.roadmap[0]?.startsWith('Day 1: List every task');
}

function extractStepsFromResearch(research: any, category: CategoryKey): { number: string; title: string; desc: string }[] {
  // Use category-specific steps when research is generic (no Gemini key)
  if (isGenericResearch(research)) {
    return CATEGORY_STEPS[category].map((s, i) => ({ number: String(i + 1), ...s }));
  }
  // Use roadmap from real research (Gemini path)
  const roadmap: string[] = research.roadmap || [];
  const apps: string[] = research.business_applications || [];
  const indices = roadmap.length >= 5 ? [0, 2, 4] : [0, 1, Math.min(2, roadmap.length - 1)];
  return indices.slice(0, 3).map((idx, i) => {
    const raw = roadmap[idx] || '';
    const title = raw.replace(/^(Day \d+[+-]?[–-]?\d*:|Week \d+[+-]?[–-]?\d*:)/i, '').trim().slice(0, 65);
    const desc = apps[i] ? apps[i].replace(/\s*[—–-]\s*save.*/i, '').trim().slice(0, 85) : CATEGORY_STEPS[category][i]?.desc || '';
    return { number: String(i + 1), title: title || CATEGORY_STEPS[category][i].title, desc };
  });
}

// ─── Topic-Specific Diagram Labels (Fix B) ────────────────────────────────────

const CATEGORY_DIAGRAMS: Record<CategoryKey, { input: string; output: string }> = {
  'claude-code':     { input: 'Manual Dev Work',      output: 'Shipped & Tested' },
  'make-automation': { input: 'Manual Client Tasks',  output: 'Runs Automatically' },
  'ai-agents':       { input: 'Repetitive Data Work', output: 'Accurate & Fast' },
  'business-ai':     { input: 'Your Current Workflow', output: 'Optimized. Scaled.' },
};

function buildDiagram(topic: string, category: CategoryKey, research: any) {
  const defaults = CATEGORY_DIAGRAMS[category];
  let inputLabel = defaults.input;
  let outputLabel = defaults.output;

  // Override from research if non-generic
  if (!isGenericResearch(research)) {
    const app0 = research.business_applications?.[0] || '';
    const match = app0.match(/automate\s+(.+?)(?:\s*[—–-]|\s*save|\s*,|$)/i);
    if (match?.[1]) {
      inputLabel = match[1].replace(/\b(your|the|a|an)\b\s*/gi, '').trim().slice(0, 22) || defaults.input;
    }
    const lastRoad = research.roadmap?.[research.roadmap.length - 1] || '';
    const roadParts = lastRoad.split(/[:.]/);
    const outcome = roadParts[roadParts.length - 1].trim().slice(0, 24);
    if (outcome.length >= 5) outputLabel = outcome;
  }

  const processLabel = topic.replace(/[^a-zA-Z0-9\s]/g, '').trim().slice(0, 18);

  return {
    type: 'diagram',
    title: 'How It Fits Your Business',
    nodes: [
      { id: 'in',  label: inputLabel,    type: 'input' },
      { id: 'ai',  label: processLabel,  type: 'process' },
      { id: 'out', label: outputLabel,   type: 'output' },
    ],
    edges: [{ from: 'in', to: 'ai' }, { from: 'ai', to: 'out' }],
  };
}

// ─── Category-Specific Icons for Cover ────────────────────────────────────────

const CATEGORY_ICONS: Record<CategoryKey, string[]> = {
  'claude-code':     ['🤖', '💻', '⚡', '⚙️', '📝'],
  'make-automation': ['🔗', '⚡', '🔄', '⚙️', '📊'],
  'ai-agents':       ['🤖', '🧠', '⚡', '🔄', '🎯'],
  'business-ai':     ['📈', '💰', '⚡', '🎯', '🚀'],
};

// ─── Category-Specific Body Copy ──────────────────────────────────────────────

const SLIDE2_BODY: Record<CategoryKey, string> = {
  'claude-code':     'Think of it like a developer who reads your entire codebase, then acts on it — no briefing needed every time.',
  'make-automation': 'Think of it like hiring a coordinator who runs your client workflow 24/7, never forgets a step, never gets tired.',
  'ai-agents':       'Think of it like a tireless employee who handles your most boring, repetitive work — automatically, around the clock.',
  'business-ai':     'Think of it like adding a full-time analyst and assistant to your team for the cost of a coffee subscription.',
};

const SLIDE3_BODY: Record<CategoryKey, string> = {
  'claude-code':     'The devs shipping with Claude Code are lapping the ones still doing it manually.\n\nHere\'s what the gap actually looks like:',
  'make-automation': 'Agencies using Make are taking on twice the clients without hiring.\n\nHere\'s what the numbers look like:',
  'ai-agents':       'Companies deploying agents are processing 10x the data at a fraction of the cost.\n\nThe numbers are real:',
  'business-ai':     'The businesses ahead are using AI on the right tasks — not all of them.\n\nHere\'s what smart adoption actually looks like:',
};

const SLIDE4_INTRO: Record<CategoryKey, string> = {
  'claude-code':     'Start coding with Claude this week — no experience required:',
  'make-automation': 'Build your first Make automation this week:',
  'ai-agents':       'Deploy your first AI agent this week — step by step:',
  'business-ai':     'Start using AI in your business this week:',
};

// ─── Caption Builder ───────────────────────────────────────────────────────────

const CAPTION_HOOKS: Record<CategoryKey, string> = {
  'claude-code':     'Most devs are still writing code by hand. Claude Code users are 5x faster and barely breaking a sweat.',
  'make-automation': 'Your competitors are handling client onboarding while they sleep. Make.com makes that possible in a weekend.',
  'ai-agents':       'Manual data entry is the #1 task AI can eliminate completely — most businesses haven\'t started yet.',
  'business-ai':     'The gap between AI-enabled businesses and everyone else is widening every month. Here\'s how to cross it.',
};

const CAPTION_BULLETS: Record<CategoryKey, string[]> = {
  'claude-code': [
    '→ How to set up Claude memory so it knows your codebase',
    '→ The exact command that lets it write + run code autonomously',
    '→ What I use it for daily (saves me 3-4 hours every session)',
    '→ Common mistakes that waste your tokens and time',
  ],
  'make-automation': [
    '→ The trigger + module structure that handles 80% of use cases',
    '→ How to connect your CRM, calendar, and Slack in one workflow',
    '→ The client onboarding automation that took me 2 hrs to build',
    '→ Error handling so it never breaks silently on a client deliverable',
  ],
  'ai-agents': [
    '→ Why single-purpose agents outperform complex multi-agent setups',
    '→ The 3 tools you need to give every data-entry agent',
    '→ How to add human approval without slowing the whole thing down',
    '→ Real accuracy benchmarks: 94%+ with the right validation loop',
  ],
  'business-ai': [
    '→ The task audit that reveals your highest-ROI automation target',
    '→ How to measure time saved and cost per deliverable',
    '→ The AI stack I recommend for businesses under $500k revenue',
    '→ What NOT to automate first (this one surprises most people)',
  ],
};

function buildCaption(topic: string, keyword: string, category: CategoryKey): string {
  const hook = CAPTION_HOOKS[category] || `Your competitors are already using ${topic}. Here's the playbook they're following.`;
  const bullets = CAPTION_BULLETS[category] || CAPTION_BULLETS['business-ai'];
  const magnet = generateLeadMagnetText(category);
  return `${hook}\n\nHere's the complete breakdown:\n\n${bullets.join('\n')}\n\nComment "${keyword}" and I'll send you the ${magnet} 🔥\n\n📌 Save this before you lose it\n\n#claudecode #claudeai #aiautomation #aiforbusiness #aiagents #automation #anthropic #artificialintelligence #aitools #machinelearning #futureofwork #productivity #businessowner #entrepreneurship #businessgrowth #scaleyourbusiness #simpliscale #thenickcornelius #nocode #solopreneur #agencyowner`;
}

// ─── Quality Gate ─────────────────────────────────────────────────────────────

function needsCoverRewrite(text: string): boolean {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > 9) return true;
  if (/\.\.\.|W:|…|–\s*$|—\s*$/.test(text)) return true;
  if (/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/.test(text)) return true;
  return false;
}

function runQualityGate(slides: any[], keyword: string, caption: string, topic = '') {
  const issues: string[] = [];
  const warnings: string[] = [];
  const category = detectCategory(topic) as CategoryKey;

  // Sanitize keyword — reject stop words
  const rawKw = (keyword || 'REPLY').toUpperCase();
  const kw = KW_STOP.has(rawKw) ? generateKeyword(topic, category) : rawKw;

  if (slides.length < 4) issues.push(`Only ${slides.length} slides. Minimum 4 required.`);

  // Cover check
  const cover = slides[0];
  let fixedCover = cover;
  if (cover) {
    if (needsCoverRewrite(cover.text || '')) {
      const hash = hashTopic(topic.toLowerCase());
      const hl = pickCoverHeadline(topic, category, hash);
      fixedCover = { ...cover, text: hl, accent_word: pickCoverAccentWord(hl), visual: { ...cover.visual, gradient_hue: generateGradientHue(topic) } };
      warnings.push('Cover headline auto-rewritten.');
    }
    if (!fixedCover.accent_word) warnings.push('Cover missing accent_word.');
  }

  const last = slides[slides.length - 1];
  if (last?.visual?.type !== 'cta_slide') warnings.push('Last slide is not a cta_slide.');

  // Fix CTA keyword in last slide too (Bonus Fix 1+2)
  const fixedSlides = slides.map((s, i) => {
    let base = i === 0 ? fixedCover : s;
    // Fix CTA slide keyword
    if (base.visual?.type === 'cta_slide') {
      const ctaKw = KW_STOP.has((base.visual.keyword || '').toUpperCase())
        ? kw : (base.visual.keyword || kw).toUpperCase();
      base = { ...base, visual: { ...base.visual, keyword: ctaKw } };
    }
    const fixedText = replaceForbidden(truncateWords(base.text || '', i === 0 ? 12 : 40));
    return { ...base, text: fixedText };
  });

  const badStarts = ['I ', 'Today,', 'Excited', 'Thrilled', 'Happy to'];
  if (badStarts.some(b => caption.startsWith(b))) {
    warnings.push('Caption opener is weak.');
  }

  return { passed: issues.length === 0, issues, warnings, slides: fixedSlides, keyword: kw, caption };
}

// ─── Dynamic Slide Sequences ──────────────────────────────────────────────────

type SlideType = 'COVER' | 'BIG_QUOTE' | 'CODE_BLOCK' | 'TOOL_CARD' | 'NUMBERED_STEPS' | 'STATS_GRID' | 'FLOW_DIAGRAM' | 'COMPARISON' | 'CHECKLIST' | 'CTA';

const SLIDE_SEQUENCES: Record<CategoryKey, SlideType[]> = {
  'claude-code':     ['COVER', 'CODE_BLOCK', 'TOOL_CARD', 'NUMBERED_STEPS', 'CTA'],
  'make-automation': ['COVER', 'FLOW_DIAGRAM', 'STATS_GRID', 'NUMBERED_STEPS', 'CTA'],
  'ai-agents':       ['COVER', 'COMPARISON', 'STATS_GRID', 'NUMBERED_STEPS', 'CTA'],
  'business-ai':     ['COVER', 'BIG_QUOTE', 'STATS_GRID', 'NUMBERED_STEPS', 'CTA'],
};

// ─── Big Quote Content ─────────────────────────────────────────────────────────

const BIG_QUOTES: Record<CategoryKey, string[]> = {
  'business-ai': [
    'Most business owners are using AI wrong — they start with complex agents instead of boring automation.',
    'The highest-ROI AI move isn\'t the flashiest one. It\'s the task you hate doing every single week.',
    'AI won\'t replace you. A business owner using AI smarter than you will.',
  ],
  'claude-code': [
    'Every senior dev stopped writing boilerplate code months ago. Most juniors don\'t know it yet.',
    'The gap isn\'t AI vs no AI anymore. It\'s using Claude with full context vs using it like a search engine.',
    'Claude Code reads your entire codebase and acts on it. That\'s not autocomplete — that\'s a co-developer.',
  ],
  'make-automation': [
    'Your competitors are onboarding new clients while they sleep. Make.com makes that possible in one weekend.',
    'If you do the same 5-step task three times a week, you\'re paying a human to do a machine\'s job.',
    'The agencies scaling fastest aren\'t hiring more people. They automate the work before they scale headcount.',
  ],
  'ai-agents': [
    'One AI agent running 24/7 outperforms a full-time hire on the right task — at 1% of the cost.',
    'The companies winning with AI agents gave them one clear job and three tools. Nothing more.',
    'Agents don\'t replace people. They replace the hours your best people spend on their worst work.',
  ],
};

// ─── Comparison Content ────────────────────────────────────────────────────────

const COMPARISON_DATA: Record<CategoryKey, { before: string[]; after: string[] }> = {
  'ai-agents': {
    before: ['Manual entry: 4+ hrs/day', 'Error rate: 3–5% human', 'Bottleneck at scale', 'Cost: $25/hr minimum', 'Works 9–5 only'],
    after:  ['Automated: minutes/batch', 'Error rate: <0.1%', 'Scales to any volume', 'Cost: ~$0.02/1k rows', 'Runs 24/7, no breaks'],
  },
  'make-automation': {
    before: ['Follow-ups: 2 hrs/day', 'Missed touchpoints weekly', 'Context switch every task', 'Onboarding: 45 min/client', 'Steps forgotten under load'],
    after:  ['Automated sequences', 'Zero missed touchpoints', 'One workflow, all tools', 'Onboarding: 8 min/client', 'Every step runs always'],
  },
  'claude-code': {
    before: ['Write boilerplate by hand', 'Context lost every session', 'Debug one file at a time', 'Docs always outdated', '3+ hrs per simple feature'],
    after:  ['Claude writes it instantly', 'CLAUDE.md keeps context', 'Reads full codebase', 'Docs auto-updated', '25 min start to shipped'],
  },
  'business-ai': {
    before: ['Reports: 2–4 hrs each', 'Research = browser spiral', 'First draft needs rewrites', 'Ideas stuck in your head', 'Meetings without output'],
    after:  ['Reports in 12 minutes', 'Research synthesized fast', 'First draft is 80% there', 'AI structures ideas live', 'Summary + actions: 5 min'],
  },
};

const COMPARISON_LABELS: Record<CategoryKey, { before: string; after: string }> = {
  'claude-code':     { before: '❌ Without Claude Code', after: '✅ With Claude Code' },
  'make-automation': { before: '❌ Manual Process', after: '✅ Make Automation' },
  'ai-agents':       { before: '❌ Manual Work', after: '✅ AI Agents' },
  'business-ai':     { before: '❌ Without AI', after: '✅ With AI' },
};

const COMPARISON_INTROS: Record<CategoryKey, string> = {
  'claude-code':     'Here\'s what the gap looks like in your dev workflow:',
  'make-automation': 'Here\'s the real cost of running this workflow manually:',
  'ai-agents':       'Here\'s what 1,000 rows looks like — with and without agents:',
  'business-ai':     'Here\'s where your time goes vs where it could go:',
};

// ─── Tool Card Content ─────────────────────────────────────────────────────────

interface ToolCardData { name: string; source: string; category: string; stars: string; icon: string; description: string; }

const TOOL_CARDS: Record<CategoryKey, ToolCardData> = {
  'claude-code': {
    name: 'Claude Code', source: 'Anthropic', category: 'AI Dev Tool', stars: '5', icon: '🤖',
    description: 'Use when: building or debugging code. Does: reads codebase, edits files, runs commands. Business value: cuts dev time 40–60% in week 1.',
  },
  'make-automation': {
    name: 'Make.com', source: 'make.com', category: 'Automation Platform', stars: '5', icon: '🔗',
    description: 'Use when: connecting 2+ apps with logic. Does: triggers, transforms, routes data. Business value: eliminates manual handoffs entirely.',
  },
  'ai-agents': {
    name: 'Claude API', source: 'Anthropic', category: 'Agent Runtime', stars: '5', icon: '🧠',
    description: 'Use when: building autonomous task agents. Does: multi-step reasoning + tool use loops. Business value: handles high-volume decisions 24/7.',
  },
  'business-ai': {
    name: 'Claude', source: 'Anthropic', category: 'AI Assistant', stars: '5', icon: '✨',
    description: 'Use when: writing, analysis, or research. Does: drafts, summarizes, structures info. Business value: cuts writing and research time 70%.',
  },
};

const TOOL_CARD_INTROS: Record<CategoryKey, string> = {
  'claude-code':     'The tool I use every session. Changed how I work completely.',
  'make-automation': 'The platform running most of my client automations:',
  'ai-agents':       'The runtime powering every agent I\'ve built:',
  'business-ai':     'The AI assistant my whole business runs on:',
};

// ─── Code Block Content ────────────────────────────────────────────────────────

interface CodeBlockData { code: string; language: string; instruction: string; highlights: string[]; }

const CODE_BLOCKS: Record<CategoryKey, CodeBlockData> = {
  'claude-code': {
    language: 'prompt',
    instruction: 'Paste this at the start of every Claude Code session:',
    code: `You are an expert software engineer.\nMy project: [what it does + tech stack]\nCurrent task: [specific feature or bug]\nConstraints: [performance, security, style]\nOutput: clean, working code. No placeholders.`,
    highlights: ['My project', 'Current task', 'Constraints', 'Output'],
  },
  'make-automation': {
    language: 'make',
    instruction: 'Client onboarding — copy this module structure:',
    code: `Trigger: New Typeform submission received\nStep 1: Extract name, email, package tier\nStep 2: Add row → Google Sheets (clients)\nStep 3: Send welcome email via Gmail\nStep 4: Create project → Notion workspace\n// Full setup time: ~90 minutes`,
    highlights: ['Trigger', 'Step 1', 'Step 2', 'Step 3', 'Step 4'],
  },
  'ai-agents': {
    language: 'agent',
    instruction: 'Lead qualification agent — exact structure:',
    code: `Task: Process new lead form submissions\nTools: [read_crm, enrich_data, send_slack]\nLoop: scan → score → route → notify\nApproval: flag deals > $5k for human review\nOutput: CRM updated + Slack alert sent`,
    highlights: ['Task', 'Tools', 'Loop', 'Approval', 'Output'],
  },
  'business-ai': {
    language: 'prompt',
    instruction: 'Weekly status report — use every Monday:',
    code: `Context: I run a [type] business for [customer]\nTask: Write a weekly client status update\nInput: [paste your raw notes here]\nFormat: 3 bullets, one risk, one win\nTone: Direct. Professional. No filler words.`,
    highlights: ['Context', 'Task', 'Input', 'Format', 'Tone'],
  },
};

const CODE_BLOCK_INTROS: Record<CategoryKey, string> = {
  'claude-code':     'Copy this into Claude Code. It reads your full codebase — then acts.',
  'make-automation': 'Here\'s the exact module structure for client onboarding:',
  'ai-agents':       'Here\'s the agent architecture that handles lead qualification:',
  'business-ai':     'This prompt cuts my reporting time from 2 hours to 12 minutes:',
};

const CODE_BLOCK_ACCENTS: Record<CategoryKey, string> = {
  'claude-code': 'codebase', 'make-automation': 'exact', 'ai-agents': 'automatically', 'business-ai': 'minutes',
};

// ─── Slide Builders ────────────────────────────────────────────────────────────

function buildBigQuoteSlide(topic: string, category: CategoryKey, hash: number) {
  const quotes = BIG_QUOTES[category];
  const quote = quotes[hash % quotes.length];
  const accentCandidates = quote.split(/\s+/).filter(w => w.length > 5 && !KW_STOP.has(w.replace(/[^a-zA-Z]/g, '').toUpperCase()));
  return {
    text: quote,
    accent_word: accentCandidates[0]?.replace(/[^a-zA-Z]/g, '') || undefined,
    visual: { type: 'big_quote' as const, supporting: 'Here\'s what most people get wrong:' },
  };
}

function buildComparisonSlide(topic: string, category: CategoryKey) {
  const data = COMPARISON_DATA[category];
  const labels = COMPARISON_LABELS[category];
  return {
    text: COMPARISON_INTROS[category],
    accent_word: category === 'make-automation' ? 'real' : category === 'ai-agents' ? 'agents' : category === 'claude-code' ? 'gap' : 'time',
    visual: {
      type: 'comparison' as const,
      before_label: labels.before,
      after_label: labels.after,
      before_items: data.before,
      after_items: data.after,
    },
  };
}

function buildToolCardSlide(topic: string, category: CategoryKey) {
  const tool = TOOL_CARDS[category];
  return {
    text: TOOL_CARD_INTROS[category],
    accent_word: 'tool',
    visual: {
      type: 'skill_card' as const,
      name: tool.name, source: tool.source, category: tool.category,
      stars: tool.stars, icon: tool.icon, description: tool.description,
    },
  };
}

function buildCodeBlockSlide(topic: string, category: CategoryKey) {
  const cb = CODE_BLOCKS[category];
  return {
    text: CODE_BLOCK_INTROS[category],
    accent_word: CODE_BLOCK_ACCENTS[category],
    visual: {
      type: 'code_block' as const,
      language: cb.language,
      instruction: cb.instruction,
      code: cb.code,
      highlights: cb.highlights,
    },
  };
}

function buildSlidesFromSequence(
  seq: SlideType[], topic: string, category: CategoryKey, hash: number,
  research: any, keyword: string, gradientHue: number, ctaHeadline: string,
  icons: string[], stats: StatItem[], steps: { number: string; title: string; desc: string }[]
) {
  const coverHeadline = pickCoverHeadline(topic, category, hash);
  const coverAccent = pickCoverAccentWord(coverHeadline);
  const ctaVariant = (hashTopic(keyword) % 3 !== 2 ? 'photo' : 'text') as 'photo' | 'text';

  return seq.map(type => {
    switch (type) {
      case 'COVER':
        return { text: coverHeadline, accent_word: coverAccent, visual: { type: 'cover_photo' as const, photo_direction: 'direct camera, confident, slight lean forward', floating_elements: icons, gradient_hue: gradientHue } };
      case 'BIG_QUOTE':
        return buildBigQuoteSlide(topic, category, hash);
      case 'CODE_BLOCK':
        return buildCodeBlockSlide(topic, category);
      case 'TOOL_CARD':
        return buildToolCardSlide(topic, category);
      case 'COMPARISON':
        return buildComparisonSlide(topic, category);
      case 'FLOW_DIAGRAM':
        return { text: SLIDE2_BODY[category], accent_word: category === 'make-automation' ? 'tired' : 'briefing', visual: buildDiagram(topic, category, research) };
      case 'STATS_GRID':
        return { text: SLIDE3_BODY[category], accent_word: 'numbers', visual: { type: 'stats_grid' as const, stats } };
      case 'NUMBERED_STEPS':
        return { text: SLIDE4_INTRO[category], accent_word: 'week', section_label: '— Your Action Plan —', visual: { type: 'steps_list' as const, steps } };
      case 'CTA':
        return { text: ctaHeadline, accent_word: ctaHeadline.split(/\s+/).find(w => w.length > 4 && !KW_STOP.has(w.toUpperCase())) || 'Full', visual: { type: 'cta_slide' as const, keyword, layout_variant: ctaVariant } };
      default:
        return { text: topic, visual: { type: 'none' as const } };
    }
  });
}

// ─── Build Fallback (Fix B — fully dynamic, research-aware) ──────────────────

function buildFallback(topic: string, style: string, researchContext?: any) {
  const category = detectCategory(topic) as CategoryKey;
  const hash = hashTopic(topic.toLowerCase());
  const keyword = generateKeyword(topic, category);
  const ctaHeadline = generateCTAHeadline(category);
  const gradientHue = generateGradientHue(topic.toLowerCase());
  const coverHeadline = pickCoverHeadline(topic, category, hash);
  const coverAccent = pickCoverAccentWord(coverHeadline);
  const icons = CATEGORY_ICONS[category];
  const stats = generateTopicStats(topic, category, hash, researchContext);
  const steps = extractStepsFromResearch(researchContext, category);
  const caption = buildCaption(topic, keyword, category);

  const coverSlide = {
    text: coverHeadline,
    accent_word: coverAccent,
    visual: {
      type: 'cover_photo',
      photo_direction: 'direct camera, confident, slight lean forward',
      floating_elements: icons,
      gradient_hue: gradientHue,
    },
  };

  const ctaVariant = (hashTopic(keyword) % 3 !== 2 ? 'photo' : 'text') as 'photo' | 'text';
  const ctaSlide = {
    text: ctaHeadline,
    accent_word: ctaHeadline.split(/\s+/).find(w => w.length > 4 && !KW_STOP.has(w.toUpperCase())) || 'Full',
    visual: { type: 'cta_slide', keyword, layout_variant: ctaVariant },
  };

  if (style === 'use_case_list') {
    return {
      topic, style, keyword,
      slides: [
        coverSlide,
        {
          text: 'Client reporting used to take 4 hours.\n\nNow it takes 8 minutes. Here\'s the exact swap:',
          accent_word: 'minutes',
          section_label: '— Use Case 1 —',
          visual: { type: 'steps_list', steps: steps.map(s => ({ number: s.number, title: s.title, desc: s.desc })) },
        },
        {
          text: SLIDE3_BODY[category],
          accent_word: 'numbers',
          section_label: '— Use Case 2 —',
          visual: { type: 'stats_grid', stats },
        },
        {
          text: 'Proposals: 45 minutes each × 10/week = 7.5 hrs gone.\n\nNow it\'s 4 minutes.',
          accent_word: 'minutes',
          section_label: '— Use Case 3 —',
          visual: { type: 'none' },
        },
        ctaSlide,
      ],
      caption,
    };
  }

  if (style === 'prompt_reveal') {
    return {
      topic, style, keyword,
      slides: [
        coverSlide,
        {
          text: 'Step 1: Give AI the right context.\n\nGarbage in = garbage out.',
          accent_word: 'context',
          section_label: '— Step 1 —',
          visual: {
            type: 'code_block', language: 'prompt',
            instruction: 'Start every session with this setup:',
            code: `You are an expert in ${topic}.\nMy business: [what you do + who you serve]\nGoal: [specific outcome you want]\nVoice: [professional/casual/direct]\nFormat: [bullets/paragraphs/table]`,
            highlights: ['My business', 'Goal', 'Voice', 'Format'],
          },
        },
        {
          text: 'Step 2: Be specific about the output. Vague prompts = vague results.',
          accent_word: 'specific',
          section_label: '— Step 2 —',
          visual: {
            type: 'code_block', language: 'prompt',
            instruction: 'Then ask for the exact thing you need:',
            code: `Task: [exact deliverable — one sentence]\nContext: [relevant background, constraints]\nExamples: [paste something good you wrote]\nOutput: [length, format, tone requirements]`,
            highlights: ['Task', 'Context', 'Examples', 'Output'],
          },
        },
        {
          text: 'Step 3: The refinement loop. Do this after any output that misses.',
          accent_word: 'refinement',
          section_label: '— Step 3 —',
          visual: { type: 'steps_list', steps: steps.map(s => ({ number: s.number, title: s.title, desc: s.desc })) },
        },
        ctaSlide,
      ],
      caption,
    };
  }

  // ── tech_breakdown (default) — category-specific slide sequence ──
  const seq = SLIDE_SEQUENCES[category];
  return {
    topic, style, keyword,
    slides: buildSlidesFromSequence(seq, topic, category, hash, researchContext, keyword, gradientHue, ctaHeadline, icons, stats, steps),
    caption,
  };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { topic, style = 'tech_breakdown', custom_angle, research_context } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });

  const category = detectCategory(topic) as CategoryKey;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const fb = buildFallback(topic, style, research_context);
    const qg = runQualityGate(fb.slides, fb.keyword, fb.caption, topic);
    return res.json({ ...fb, slides: qg.slides, keyword: qg.keyword, quality_report: qg, generated_at: new Date().toISOString() });
  }

  try {
    const styleGuide: Record<string, string> = {
      tech_breakdown: `SLIDE 1 (COVER): 4-8 word headline using a formula. cover_photo visual.
SLIDE 2: Simple analogy explaining what it is + how it fits their business. diagram visual.
SLIDE 3: Real numbers that prove business value. stats_grid visual (4 items).
SLIDE 4: Step-by-step action plan for this week. steps_list visual (3 steps).
SLIDE 5 (CTA): cta_slide — "Want [specific deliverable]?" format.`,
      use_case_list: `SLIDE 1 (COVER): Headline formula about replacing or transforming. cover_photo visual.
SLIDE 2: Use case #1 before/after. steps_list.
SLIDE 3: Use cases with real metrics. stats_grid.
SLIDE 4: Surprising use case or insight. none visual.
SLIDE 5 (CTA): cta_slide.`,
      prompt_reveal: `SLIDE 1 (COVER): "The exact [topic] prompt" headline. cover_photo visual.
SLIDE 2: Setup/context prompt. code_block.
SLIDE 3: Task/output prompt. code_block.
SLIDE 4: Refinement loop. steps_list.
SLIDE 5 (CTA): cta_slide.`,
    };

    // Include research context in Gemini prompt if available
    const researchSection = research_context ? `
RESEARCH CONTEXT (use this to make content specific and accurate):
Topic summary: ${research_context.full_research?.slice(0, 500) || ''}
Key metrics: ${(research_context.metrics || []).slice(0, 4).join(', ')}
Business applications: ${(research_context.business_applications || []).slice(0, 3).join(' | ')}
Roadmap steps: ${(research_context.roadmap || []).slice(0, 3).join(' | ')}
${custom_angle ? `Chosen angle: "${custom_angle}"` : ''}
` : (custom_angle ? `\nAngle: "${custom_angle}"` : '');

    const coverFormulas = [
      'Stop [Old Behavior]. [Tool] Does It In [Time].',
      'How I [Result] Using Only [Tool]',
      'The [AI Thing] Nobody Is Talking About',
      '[Number] [Tool] [Nouns] That [Business Verb] in [Time]',
      'The [Tool] [System/Trick] That [Transforms Outcome]',
    ];

    const prompt = `You are Nick Cornelius — direct AI business educator, $70k/month agency, teaching owners to use AI to make more money.

Create a 5-slide Instagram carousel about: "${topic}"
Category: ${category}
${researchSection}

FORMAT: ${style}
STRUCTURE:
${styleGuide[style] || styleGuide.tech_breakdown}

COVER HEADLINE — use one of these formulas (4-8 words max):
${coverFormulas.join('\n')}

KEYWORD RULES:
- Pick the MAIN TOOL or SUBJECT from the topic (max 8 chars)
- Tool names always win: claude → CLAUDE, make.com → MAKE, n8n → N8N
- NEVER use stop words: WILL, HOW, THE, WHAT, WHY, IS, ARE, A, AN, TO, FOR, AND, OR, BY, AS
- Prefer: the most memorable noun or action word

CTA SLIDE HEADLINE: "${generateCTAHeadline(category)}" (use exactly this format)

COPY RULES:
- Max 40 words per slide body (cover max 8 words)
- Specific numbers always — never vague claims
- NEVER use: leverage, utilize, synergy, game-changer, revolutionary, paradigm
- accent_word: single highest-impact word per slide

Return ONLY valid JSON:
{
  "keyword": "TOOL_OR_SUBJECT_KEYWORD",
  "caption": "Full Instagram caption — strong hook, bullets with →, CTA line, 📌 save, 20-25 hashtags",
  "slides": [
    {
      "text": "slide copy",
      "accent_word": "one word",
      "section_label": "label or null",
      "visual": {
        "type": "cover_photo|code_block|stats_grid|diagram|steps_list|cta_slide|none",
        "gradient_hue": ${generateGradientHue(topic)},
        "photo_direction": "pose desc (cover_photo only)",
        "floating_elements": ["emoji1","emoji2","emoji3","emoji4","emoji5"],
        "subtext": "optional (cover_photo only)",
        "stats": [{"icon":"emoji","value":"X unit","label":"WHAT IT MEASURES"}],
        "nodes": [{"id":"in","label":"3 words max","type":"input"},{"id":"ai","label":"tool name","type":"process"},{"id":"out","label":"outcome","type":"output"}],
        "edges": [{"from":"in","to":"ai"},{"from":"ai","to":"out"}],
        "steps": [{"number":"1","title":"Action verb + what","desc":"specific detail"}],
        "keyword": "SAME_AS_TOP_LEVEL_KEYWORD",
        "code": "code text", "language": "prompt|python|js", "instruction": "label", "highlights": ["word"]
      }
    }
  ]
}

slides[0] = cover_photo. slides[4] = cta_slide. Set accent_word on all slides.`;

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.75, maxOutputTokens: 4000 },
      }),
    });
    const d = await r.json();
    let text = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (text.includes('```')) {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) text = match[1];
    }
    const data = JSON.parse(text.trim());
    if (!data.slides?.length || data.slides.length < 3) throw new Error('Not enough slides');

    // Ensure gradient_hue is set on cover (Gemini may not include it)
    if (data.slides[0]?.visual?.type === 'cover_photo') {
      data.slides[0].visual.gradient_hue = data.slides[0].visual.gradient_hue ?? generateGradientHue(topic);
    }

    const qg = runQualityGate(data.slides, data.keyword || 'REPLY', data.caption || '', topic);
    return res.json({
      topic, style,
      slides: qg.slides, keyword: qg.keyword, caption: qg.caption,
      quality_report: { passed: qg.passed, issues: qg.issues, warnings: qg.warnings },
      generated_at: new Date().toISOString(),
    });

  } catch (e) {
    console.error('Carousel error:', e);
    const fb = buildFallback(topic, style, research_context);
    const qg = runQualityGate(fb.slides, fb.keyword, fb.caption, topic);
    return res.json({ ...fb, slides: qg.slides, keyword: qg.keyword, quality_report: qg, generated_at: new Date().toISOString() });
  }
}

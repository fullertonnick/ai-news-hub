import type { NextApiRequest, NextApiResponse } from 'next';

// ─── Constants ───────────────────────────────────────────────────────────────

const AI_KEYWORDS = ['ai', 'llm', 'gpt', 'claude', 'gemini', 'openai', 'anthropic', 'machine learning',
  'deep learning', 'neural', 'automation', 'agent', 'chatbot', 'artificial intelligence', 'ml ',
  'nlp', 'transformer', 'diffusion', 'midjourney', 'stable diffusion', 'copilot', 'cursor',
  'mistral', 'llama', 'n8n', 'make.com', 'zapier', 'workflow', 'agentic', 'perplexity', 'groq'];

// YouTube creator search queries (Piped API — free, no key)
const YOUTUBE_SEARCHES = [
  { q: 'Nick Saraev AI automation n8n', creator: 'Nick Saraev' },
  { q: 'Liam Ottley AI agency automation systems', creator: 'Liam Ottley' },
  { q: 'Matt Wolfe Future Tools AI news', creator: 'Matt Wolfe' },
  { q: 'David Shapiro AI agents automation', creator: 'David Shapiro' },
  { q: 'Greg Isenberg AI startup ideas', creator: 'Greg Isenberg' },
  { q: 'n8n AI agent workflow tutorial 2024', creator: null },
  { q: 'Claude AI automation business workflow', creator: null },
  { q: 'AI automation agency build systems 2024', creator: null },
];

// Piped API instances (YouTube frontend proxy — free)
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://piped-api.garudalinux.org',
];

// X/Twitter creators (via nitter RSS — no auth needed)
const X_CREATORS = [
  { handle: 'nicksaraev', name: 'Nick Saraev' },
  { handle: 'rowancheung', name: 'Rowan Cheung' },
  { handle: 'gregisenberg', name: 'Greg Isenberg' },
  { handle: 'mattshumer_', name: 'Matt Shumer' },
  { handle: 'karpathy', name: 'Andrej Karpathy' },
  { handle: 'sama', name: 'Sam Altman' },
  { handle: 'alexalbert__', name: 'Alex Albert' },
  { handle: 'amasad', name: 'Amjad Masad' },
  { handle: 'jxnlco', name: 'Jason Liu' },
];

const NITTER_INSTANCES = [
  'https://nitter.privacydev.net',
  'https://nitter.poast.org',
  'https://nitter.1d4.us',
  'https://nitter.kavin.rocks',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isAI(text: string) { return AI_KEYWORDS.some(k => text.toLowerCase().includes(k)); }

function extractTopics(text: string): string[] {
  const map: Record<string, string> = {
    'claude': 'Claude', 'anthropic': 'Anthropic', 'openai': 'OpenAI', 'gpt': 'GPT',
    'gemini': 'Gemini', 'llama': 'Llama', 'mistral': 'Mistral', 'groq': 'Groq',
    'cursor': 'Cursor', 'copilot': 'Copilot', 'agent': 'AI Agents', 'mcp': 'MCP',
    'automation': 'Automation', 'llm': 'LLM', 'machine learning': 'ML', 'deep learning': 'Deep Learning',
    'n8n': 'n8n', 'make.com': 'Make.com', 'zapier': 'Zapier', 'workflow': 'Workflows',
    'agentic': 'AI Agents', 'perplexity': 'Perplexity', 'reasoning': 'Reasoning',
    'benchmark': 'Benchmarks', 'coding': 'Coding', 'diffusion': 'Image Generation',
  };
  const t = text.toLowerCase();
  const topics: string[] = [];
  for (const [k, v] of Object.entries(map)) if (t.includes(k) && !topics.includes(v)) topics.push(v);
  return topics.slice(0, 5);
}

function trendingScore(score: number, comments: number, hoursOld: number) {
  const raw = (score + comments * 2) / Math.max(1, Math.pow(hoursOld + 2, 1.2));
  return Math.min(99, Math.max(10, Math.round(raw * 3)));
}

function hoursOld(dateStr: string) {
  try { return (Date.now() - new Date(dateStr).getTime()) / 3600000; } catch { return 48; }
}

function parseRelativeDate(str: string): string {
  if (!str) return new Date().toISOString();
  const m = str.match(/(\d+)\s+(second|minute|hour|day|week|month|year)/i);
  if (!m) {
    try { return new Date(str).toISOString(); } catch { return new Date().toISOString(); }
  }
  const n = parseInt(m[1]);
  const ms: Record<string, number> = {
    second: 1000, minute: 60000, hour: 3600000,
    day: 86400000, week: 604800000, month: 2592000000, year: 31536000000,
  };
  return new Date(Date.now() - n * (ms[m[2].toLowerCase()] || 86400000)).toISOString();
}

function stripHtml(html: string) { return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim(); }

function parseRSSItems(xml: string) {
  const items: any[] = [];
  const reg = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = reg.exec(xml)) !== null) {
    const b = m[1];
    const title = (b.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || b.match(/<title>([\s\S]*?)<\/title>/))?.[1]?.trim() || '';
    const link = (b.match(/<link>([\s\S]*?)<\/link>/) || b.match(/<guid[^>]*>([\s\S]*?)<\/guid>/))?.[1]?.trim() || '';
    const pubDate = b.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || '';
    const desc = (b.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || b.match(/<description>([\s\S]*?)<\/description>/))?.[1] || '';
    if (title) items.push({ title, link, pubDate, desc: stripHtml(desc).slice(0, 280) });
  }
  return items;
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(tid);
    return res;
  } catch (e) {
    clearTimeout(tid);
    throw e;
  }
}

// ─── Source Scrapers ──────────────────────────────────────────────────────────

async function fetchHN(): Promise<any[]> {
  try {
    const r = await fetchWithTimeout(
      'https://hn.algolia.com/api/v1/search?query=AI+LLM+automation+agents&tags=story&hitsPerPage=40'
    );
    const d = await r.json();
    return (d.hits || []).filter((h: any) => isAI(h.title || '')).map((h: any) => ({
      id: `hn_${h.objectID}`, title: h.title,
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      source: 'HackerNews', score: h.points || 0, comments: h.num_comments || 0,
      published_at: h.created_at, summary: '',
      topics: extractTopics(h.title),
      trending_score: trendingScore(h.points || 0, h.num_comments || 0, hoursOld(h.created_at)),
      creator: null,
    }));
  } catch { return []; }
}

async function fetchReddit(sub: string): Promise<any[]> {
  try {
    const r = await fetchWithTimeout(`https://www.reddit.com/r/${sub}/hot.json?limit=25`, {
      headers: { 'User-Agent': 'AI-News-Hub/1.0' },
    });
    const d = await r.json();
    return (d.data?.children || []).map((p: any) => p.data)
      .filter((d: any) => isAI(d.title || ''))
      .map((d: any) => ({
        id: `reddit_${d.id}`, title: d.title, url: `https://reddit.com${d.permalink}`,
        source: 'Reddit', score: d.score || 0, comments: d.num_comments || 0,
        published_at: new Date(d.created_utc * 1000).toISOString(),
        summary: (d.selftext || '').slice(0, 200),
        topics: extractTopics(d.title),
        trending_score: trendingScore(d.score || 0, d.num_comments || 0, hoursOld(new Date(d.created_utc * 1000).toISOString())),
        creator: null,
      }));
  } catch { return []; }
}

async function fetchDevTo(): Promise<any[]> {
  try {
    const r = await fetchWithTimeout('https://dev.to/api/articles?tag=ai&per_page=20&top=7');
    const articles = await r.json();
    return articles.map((a: any) => ({
      id: `devto_${a.id}`, title: a.title, url: a.url,
      source: 'DEV.to', score: a.positive_reactions_count || 0, comments: a.comments_count || 0,
      published_at: a.published_at, summary: a.description || '',
      topics: extractTopics(`${a.title} ${a.description || ''}`),
      trending_score: trendingScore(a.positive_reactions_count || 0, a.comments_count || 0, hoursOld(a.published_at)),
      creator: null,
    }));
  } catch { return []; }
}

async function fetchYouTube(): Promise<any[]> {
  const results: any[] = [];
  // Try each search query, rotating through Piped instances
  for (let i = 0; i < YOUTUBE_SEARCHES.length; i++) {
    const { q, creator } = YOUTUBE_SEARCHES[i];
    const instance = PIPED_INSTANCES[i % PIPED_INSTANCES.length];
    try {
      const r = await fetchWithTimeout(
        `${instance}/search?q=${encodeURIComponent(q)}&filter=videos`, {}, 5000
      );
      if (!r.ok) continue;
      const d = await r.json();
      const videos = (d.items || []).slice(0, 3);
      for (const v of videos) {
        if (!v.title) continue;
        // Filter to AI-relevant videos
        if (!isAI(v.title + ' ' + (v.shortDescription || '')) && !creator) continue;
        const dateStr = v.uploaded ? new Date(v.uploaded).toISOString() : parseRelativeDate(v.uploadedDate || '1 day ago');
        const views = v.views || 0;
        const hrs = hoursOld(dateStr);
        const ytScore = Math.min(99, Math.max(20, Math.round((views / 1000) / Math.max(1, Math.pow(hrs / 24 + 1, 1.5)))));
        results.push({
          id: `yt_${(v.url || '').replace('/watch?v=', '') || Math.random().toString(36).slice(2)}`,
          title: v.title,
          url: v.url ? `https://youtube.com${v.url}` : '#',
          source: 'YouTube',
          score: views,
          comments: 0,
          published_at: dateStr,
          summary: (v.shortDescription || v.uploaderName ? `${creator || v.uploaderName} • ${(v.shortDescription || '').slice(0, 150)}` : '').trim(),
          topics: extractTopics(v.title + ' ' + (v.shortDescription || '')),
          trending_score: ytScore,
          creator: creator || v.uploaderName || null,
        });
      }
    } catch { /* skip failed instance */ }
  }
  return results;
}

async function fetchXCreator(handle: string, name: string): Promise<any[]> {
  for (const instance of NITTER_INSTANCES) {
    try {
      const r = await fetchWithTimeout(`${instance}/${handle}/rss`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }, 5000);
      if (!r.ok) continue;
      const xml = await r.text();
      const items = parseRSSItems(xml);
      const results: any[] = [];
      for (const item of items.slice(0, 5)) {
        const text = item.title + ' ' + item.desc;
        if (!isAI(text)) continue; // only AI-related posts
        let dateStr: string;
        try { dateStr = new Date(item.pubDate).toISOString(); } catch { dateStr = new Date().toISOString(); }
        results.push({
          id: `x_${handle}_${Buffer.from(item.title).toString('base64').slice(0, 12)}`,
          title: item.title.replace(/^R to .+?: /, '').slice(0, 150), // strip reply prefix
          url: item.link.includes('nitter') ? item.link.replace(new URL(instance).origin, 'https://x.com').replace('/status/', '/status/') : item.link,
          source: 'X (Twitter)',
          score: 0,
          comments: 0,
          published_at: dateStr,
          summary: item.desc.slice(0, 200),
          topics: extractTopics(text),
          trending_score: Math.max(30, 80 - hoursOld(dateStr) * 2),
          creator: name,
        });
      }
      if (results.length > 0) return results;
    } catch { continue; }
  }
  return [];
}

async function fetchAllXCreators(): Promise<any[]> {
  const results = await Promise.allSettled(
    X_CREATORS.map(c => fetchXCreator(c.handle, c.name))
  );
  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}

// ─── Cache & Handler ──────────────────────────────────────────────────────────

const FALLBACK = [
  { id: 'f1', title: 'Claude 3.5 Sonnet Sets New Records — What Every AI Builder Needs to Know', url: 'https://anthropic.com', source: 'HackerNews', score: 847, comments: 234, published_at: new Date().toISOString(), summary: "Anthropic's latest model leads on reasoning, coding, and vision tasks.", topics: ['Claude', 'Anthropic', 'LLM'], trending_score: 95, creator: null },
  { id: 'f2', title: 'How I Automated 90% of My Agency Work With n8n + Claude (Full Breakdown)', url: '#', source: 'YouTube', score: 42000, comments: 0, published_at: new Date().toISOString(), summary: 'Nick Saraev • Step-by-step: the exact workflow that replaced a full-time VA.', topics: ['Automation', 'Claude', 'n8n'], trending_score: 91, creator: 'Nick Saraev' },
  { id: 'f3', title: 'OpenAI o3-mini: The Reasoning Model That Changes the Cost Equation', url: 'https://openai.com', source: 'Reddit', score: 623, comments: 189, published_at: new Date().toISOString(), summary: 'o1-level reasoning at a fraction of the price. Breakdown of what this means for builders.', topics: ['OpenAI', 'Reasoning'], trending_score: 88, creator: null },
  { id: 'f4', title: 'The AI Automation Stack That\'s Printing $50k/month for Agencies', url: '#', source: 'YouTube', score: 38000, comments: 0, published_at: new Date().toISOString(), summary: 'Liam Ottley • The exact tools, pricing, and client workflows behind a $50k month.', topics: ['Automation', 'AI Agents', 'Workflows'], trending_score: 85, creator: 'Liam Ottley' },
  { id: 'f5', title: 'Gemini 1.5 Pro with 1M Context: Real-World Tests Every Developer Should See', url: 'https://ai.google.dev', source: 'HackerNews', score: 398, comments: 156, published_at: new Date().toISOString(), summary: 'Google opens up its most powerful model with a 1M token context window.', topics: ['Gemini', 'Google'], trending_score: 79, creator: null },
  { id: 'f6', title: 'MCP (Model Context Protocol) Will Change How You Build AI Apps — Here\'s Why', url: '#', source: 'DEV.to', score: 287, comments: 67, published_at: new Date().toISOString(), summary: 'MCP standardizes how LLMs connect to tools. The implications are massive.', topics: ['MCP', 'AI Agents', 'Claude'], trending_score: 74, creator: null },
  { id: 'f7', title: '🧵 Stop using AI as a search engine. Here\'s the right mental model:', url: '#', source: 'X (Twitter)', score: 0, comments: 0, published_at: new Date().toISOString(), summary: 'Most people use ChatGPT like Google. That\'s why they get mediocre results. Thread on the right way to think about AI tools for business...', topics: ['Automation', 'AI Agents'], trending_score: 71, creator: 'Nick Saraev' },
  { id: 'f8', title: 'Cursor AI vs GitHub Copilot: 90-Day Real Dev Test (I Tracked Everything)', url: '#', source: 'DEV.to', score: 356, comments: 98, published_at: new Date().toISOString(), summary: 'Acceptance rate, time saved, and error rate across 3 production projects.', topics: ['Cursor', 'Copilot', 'Coding'], trending_score: 68, creator: null },
];

let newsCache: { items: any[], ts: number } | null = null;
let creatorCache: { items: any[], ts: number } | null = null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const limit = parseInt(req.query.limit as string || '20');
  const offset = parseInt(req.query.offset as string || '0');
  const topic = req.query.topic as string | undefined;
  const source = req.query.source as string | undefined;
  const now = Date.now();

  // Refresh main news every 5 minutes
  if (!newsCache || now - newsCache.ts > 300000) {
    const [hn, r1, r2, r3, devto] = await Promise.allSettled([
      fetchHN(),
      fetchReddit('artificial'),
      fetchReddit('MachineLearning'),
      fetchReddit('ClaudeAI'),
      fetchDevTo(),
    ]);
    const all: any[] = [];
    const seen = new Set<string>();
    for (const r of [hn, r1, r2, r3, devto]) {
      if (r.status === 'fulfilled') {
        for (const item of r.value) {
          const key = item.title.toLowerCase().slice(0, 50);
          if (!seen.has(key)) { seen.add(key); all.push(item); }
        }
      }
    }
    all.sort((a, b) => b.trending_score - a.trending_score);
    newsCache = { items: all.length > 0 ? all : [], ts: now };
  }

  // Refresh creator content (YouTube + X) every 10 minutes
  if (!creatorCache || now - creatorCache.ts > 600000) {
    const [yt, xItems] = await Promise.allSettled([fetchYouTube(), fetchAllXCreators()]);
    const creatorItems: any[] = [];
    const seen = new Set<string>();
    for (const r of [yt, xItems]) {
      if (r.status === 'fulfilled') {
        for (const item of r.value) {
          const key = item.title.toLowerCase().slice(0, 50);
          if (!seen.has(key)) { seen.add(key); creatorItems.push(item); }
        }
      }
    }
    creatorItems.sort((a, b) => b.trending_score - a.trending_score);
    creatorCache = { items: creatorItems, ts: now };
  }

  // Merge: interleave creator content into the main feed
  const mainItems = newsCache.items;
  const creatorItems = creatorCache.items;

  // Interleave: 1 creator item every 4 main items
  const merged: any[] = [];
  let ci = 0;
  for (let i = 0; i < mainItems.length; i++) {
    merged.push(mainItems[i]);
    if ((i + 1) % 4 === 0 && ci < creatorItems.length) {
      merged.push(creatorItems[ci++]);
    }
  }
  // Append remaining creator items
  while (ci < creatorItems.length) merged.push(creatorItems[ci++]);

  // Fallback if completely empty
  const allItems = merged.length > 0 ? merged : FALLBACK;

  let items = allItems;
  if (topic) items = items.filter((i: any) =>
    i.topics.some((t: string) => t.toLowerCase().includes(topic.toLowerCase())) ||
    i.title.toLowerCase().includes(topic.toLowerCase()) ||
    (i.creator || '').toLowerCase().includes(topic.toLowerCase())
  );
  if (source) items = items.filter((i: any) => i.source === source);

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  res.json({ items: items.slice(offset, offset + limit), total: items.length, has_more: offset + limit < items.length });
}

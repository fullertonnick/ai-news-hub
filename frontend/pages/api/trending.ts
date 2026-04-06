import type { NextApiRequest, NextApiResponse } from 'next';

export const config = { maxDuration: 30 };

// ─── Topic extraction ────────────────────────────────────────────────────────

const TOPIC_MAP: Record<string, string> = {
  'claude': 'Claude', 'claude code': 'Claude Code', 'anthropic': 'Anthropic',
  'openai': 'OpenAI', 'chatgpt': 'ChatGPT', 'gpt-4': 'GPT-4', 'gpt-5': 'GPT-5', 'gpt': 'GPT',
  'gemini': 'Gemini', 'llama': 'Llama', 'mistral': 'Mistral', 'deepseek': 'DeepSeek',
  'cursor': 'Cursor', 'copilot': 'Copilot', 'windsurf': 'Windsurf', 'replit': 'Replit',
  'agent': 'AI Agents', 'agentic': 'AI Agents', 'multi-agent': 'Multi-Agent',
  'mcp': 'MCP', 'model context protocol': 'MCP',
  'automation': 'Automation', 'n8n': 'n8n', 'make.com': 'Make.com', 'zapier': 'Zapier',
  'llm': 'LLM', 'rag': 'RAG', 'fine-tun': 'Fine-tuning', 'embeddings': 'Embeddings',
  'reasoning': 'Reasoning', 'benchmark': 'Benchmarks', 'coding': 'AI Coding',
  'voice': 'AI Voice', 'text-to-speech': 'TTS', 'whisper': 'Speech AI',
  'diffusion': 'Image Gen', 'midjourney': 'Midjourney', 'stable diffusion': 'Stable Diffusion',
  'imagen': 'Imagen', 'flux': 'Flux',
  'open source': 'Open Source AI', 'open-source': 'Open Source AI',
  'saas': 'AI SaaS', 'startup': 'AI Startups',
  'prompt': 'Prompting', 'prompt engineering': 'Prompting',
  'workflow': 'Workflows', 'no-code': 'No-Code AI', 'nocode': 'No-Code AI',
};

function extractTopics(text: string): string[] {
  const t = text.toLowerCase();
  const found: string[] = [];
  // Check longer keys first (multi-word matches)
  const sorted = Object.entries(TOPIC_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [k, v] of sorted) {
    if (t.includes(k) && !found.includes(v)) found.push(v);
  }
  return found.slice(0, 5);
}

interface TopicData { count: number; score: number; sources: Set<string>; }

// ─── Reddit scraping (public JSON API — no auth needed) ──────────────────────

async function fetchReddit(): Promise<{ title: string; score: number; comments: number; source: string }[]> {
  const subreddits = [
    'artificial', 'MachineLearning', 'ChatGPT', 'ClaudeAI',
    'LocalLLaMA', 'singularity', 'AIAgents',
  ];

  const results: { title: string; score: number; comments: number; source: string }[] = [];

  await Promise.allSettled(
    subreddits.map(async sub => {
      try {
        const r = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=25`, {
          headers: { 'User-Agent': 'SimpliScaleDashboard/1.0' },
          signal: AbortSignal.timeout(8000),
        });
        const d = await r.json();
        for (const post of d?.data?.children || []) {
          const p = post.data;
          if (p.stickied) continue;
          results.push({
            title: p.title || '',
            score: p.score || 0,
            comments: p.num_comments || 0,
            source: `reddit:${sub}`,
          });
        }
      } catch { /* skip failed subreddit */ }
    })
  );

  return results;
}

// ─── HackerNews ──────────────────────────────────────────────────────────────

async function fetchHackerNews(): Promise<{ title: string; score: number; comments: number; source: string }[]> {
  try {
    const r = await fetch('https://hn.algolia.com/api/v1/search?query=AI+LLM+agent+automation&tags=story&hitsPerPage=50', {
      signal: AbortSignal.timeout(8000),
    });
    const d = await r.json();
    return (d.hits || []).map((h: any) => ({
      title: h.title || '',
      score: h.points || 0,
      comments: h.num_comments || 0,
      source: 'hackernews',
    }));
  } catch { return []; }
}

// ─── Combine and rank ────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Fetch from multiple sources in parallel
  const [redditPosts, hnPosts] = await Promise.all([
    fetchReddit(),
    fetchHackerNews(),
  ]);

  const allPosts = [...redditPosts, ...hnPosts];

  // Extract and rank topics
  const topicData: Record<string, TopicData> = {};

  for (const post of allPosts) {
    const topics = extractTopics(post.title);
    for (const t of topics) {
      if (!topicData[t]) topicData[t] = { count: 0, score: 0, sources: new Set() };
      topicData[t].count++;
      topicData[t].score += post.score + post.comments * 3; // weight comments heavily (engagement signal)
      topicData[t].sources.add(post.source.split(':')[0]); // 'reddit' or 'hackernews'
    }
  }

  const topics = Object.entries(topicData)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 20)
    .map(([topic, data]) => ({
      topic,
      count: data.count,
      hot: data.score / data.count > 80 || data.sources.size > 1, // hot if high engagement or multi-source
      sources: Array.from(data.sources),
    }));

  // If we got no results (all sources failed), return a curated fallback
  if (topics.length === 0) {
    res.json({
      topics: [
        { topic: 'Claude Code', count: 15, hot: true, sources: ['fallback'] },
        { topic: 'AI Agents', count: 12, hot: true, sources: ['fallback'] },
        { topic: 'OpenAI', count: 10, hot: true, sources: ['fallback'] },
        { topic: 'MCP', count: 8, hot: true, sources: ['fallback'] },
        { topic: 'Automation', count: 7, hot: false, sources: ['fallback'] },
        { topic: 'Make.com', count: 6, hot: false, sources: ['fallback'] },
        { topic: 'Cursor', count: 5, hot: false, sources: ['fallback'] },
        { topic: 'n8n', count: 4, hot: false, sources: ['fallback'] },
      ],
    });
    return;
  }

  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
  res.json({ topics, total_posts_analyzed: allPosts.length });
}

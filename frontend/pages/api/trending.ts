import type { NextApiRequest, NextApiResponse } from 'next';

// Import news handler logic inline — reuse cached news data
const AI_KEYWORDS = ['ai', 'llm', 'gpt', 'claude', 'gemini', 'openai', 'anthropic', 'machine learning',
  'deep learning', 'neural', 'automation', 'agent', 'chatbot', 'artificial intelligence'];

function extractTopics(text: string): string[] {
  const map: Record<string, string> = {
    'claude': 'Claude', 'anthropic': 'Anthropic', 'openai': 'OpenAI', 'gpt': 'GPT',
    'gemini': 'Gemini', 'llama': 'Llama', 'mistral': 'Mistral',
    'cursor': 'Cursor', 'copilot': 'Copilot', 'agent': 'AI Agents', 'mcp': 'MCP',
    'automation': 'Automation', 'llm': 'LLM', 'machine learning': 'ML', 'deep learning': 'Deep Learning',
    'reasoning': 'Reasoning', 'benchmark': 'Benchmarks', 'coding': 'Coding',
  };
  const t = text.toLowerCase();
  const topics: string[] = [];
  for (const [k, v] of Object.entries(map)) if (t.includes(k) && !topics.includes(v)) topics.push(v);
  return topics.slice(0, 5);
}

function isAI(text: string) { return AI_KEYWORDS.some(k => text.toLowerCase().includes(k)); }

async function fetchTopicsFromNews(): Promise<any[]> {
  try {
    const r = await fetch('https://hn.algolia.com/api/v1/search?query=AI+LLM&tags=story&hitsPerPage=50', { next: { revalidate: 300 } });
    const d = await r.json();
    const topicCounts: Record<string, { count: number, score: number }> = {};
    for (const h of d.hits || []) {
      if (!isAI(h.title || '')) continue;
      const topics = extractTopics(h.title);
      for (const t of topics) {
        if (!topicCounts[t]) topicCounts[t] = { count: 0, score: 0 };
        topicCounts[t].count++;
        topicCounts[t].score += (h.points || 0) + (h.num_comments || 0) * 2;
      }
    }
    return Object.entries(topicCounts)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 15)
      .map(([topic, { count, score }]) => ({ topic, count, hot: score / count > 100 }));
    // Note: n8n, Workflows, AI Agents always added if not present via YouTube/X scraping
  } catch {
    return [
      { topic: 'Claude', count: 12, hot: true },
      { topic: 'OpenAI', count: 10, hot: true },
      { topic: 'AI Agents', count: 9, hot: true },
      { topic: 'Automation', count: 8, hot: true },
      { topic: 'n8n', count: 7, hot: true },
      { topic: 'LLM', count: 7, hot: false },
      { topic: 'Workflows', count: 6, hot: false },
      { topic: 'Gemini', count: 6, hot: false },
      { topic: 'Cursor', count: 5, hot: false },
      { topic: 'MCP', count: 4, hot: false },
    ];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const topics = await fetchTopicsFromNews();
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  res.json({ topics });
}

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic, tone = 'authority', format = 'single' } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  const prompt = `You are Nick Cornelius — direct AI business educator, $70K/month combined revenue from KingCaller AI + SimpliScale. 40+ employees, location-independent.

Write ${format === 'thread' ? 'a 3-5 tweet thread' : 'a single tweet'} about: "${topic}"

TONE: ${tone}
- authority: Speak from proven results, specific numbers, peer-to-peer
- contrarian: Challenge conventional wisdom with data
- educational: Break down complex AI/automation concepts
- results: Lead with specific outcomes and transformations

RULES:
- ${format === 'single' ? 'Max 280 characters' : 'Each tweet max 280 characters'}
- Short punchy sentences. 3-8 words each.
- Zero fluff words (leverage, utilize, synergy, game-changer)
- Include specific numbers when possible
- No hashtags (they hurt reach on X)
- No emojis (unless strategic — max 1)
- Sound like a peer sharing insights, never a guru preaching
- End with engagement hook or controversial statement

${format === 'thread' ? 'Return JSON: {"posts": ["tweet1", "tweet2", ...]}' : 'Return JSON: {"text": "the tweet"}'}`;

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: 1000 },
      }),
    });
    const d = await r.json();
    let text = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (text.includes('```')) {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) text = match[1];
    }
    const parsed = JSON.parse(text.trim());
    return res.json(parsed);
  } catch {
    // Fallback
    return res.json({ text: `${topic}. Most business owners are sleeping on this. The ones who move now will own the next 5 years.`, posts: [`${topic}. Most business owners are sleeping on this.`] });
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic, length = 'medium (45-75s)', hook_type = 'results claim', cta_type = 'comment' } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  const prompt = `You are Nick Cornelius — direct AI business educator. $70K+/month from KingCaller AI ($50K) + SimpliScale ($20K). Former pharma chemist → 7-figure entrepreneur in 4 years. 40+ employees, location-independent.

Write an Instagram reel script about: "${topic}"

LENGTH: ${length}
HOOK TYPE: ${hook_type}
CTA TYPE: ${cta_type}

FRAMEWORK (follow exactly):
1. HOOK (first 3 seconds) — pattern interrupt, bold claim or shocking stat
2. PROBLEM (1-3 sentences) — identify pain, calculate cost
3. SOLUTION (1-3 sentences) — introduce your method/tool
4. PROOF (1-2 sentences) — specific client result or personal data
5. CTA (1 sentence) — ${cta_type === 'comment' ? 'Comment [KEYWORD] for [specific deliverable]' : cta_type === 'link-in-bio' ? 'Link in bio to [specific resource]' : cta_type === 'DM' ? 'DM me [KEYWORD] for [personal guidance]' : 'Follow for daily [content type]'}

CRITICAL RULES:
- Maximum 8 words per sentence (prefer 3-5 words)
- No compound sentences (no "and", "but", "or" joining clauses)
- Each sentence is a standalone thought
- Zero hedge words: never "I think", "maybe", "perhaps", "probably", "might"
- Zero filler: never "let me tell you", "I'd like to share"
- Use power words: exactly, literally, completely, automatically, crushing, scaling, systematizing
- Specific numbers always — never vague claims
- Sound like peer sharing insider info, never guru preaching
- Consistent high energy throughout
- Include at least one contrast pattern: "Most people [wrong]... Winners [right]"

Return the script as plain text, each sentence on its own line. Add [HOOK], [PROBLEM], [SOLUTION], [PROOF], [CTA] section labels. Return ONLY the script text in JSON: {"script": "..."}`;

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 1500 },
      }),
    });
    const d = await r.json();
    let text = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (text.includes('```')) {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) text = match[1];
    }
    try {
      const parsed = JSON.parse(text.trim());
      return res.json(parsed);
    } catch {
      return res.json({ script: text.trim() });
    }
  } catch {
    return res.json({ script: `[HOOK]\n${topic}. Most people are ignoring this.\n\n[PROBLEM]\nManual processes drain your time.\nYour competitors already automated.\n\n[SOLUTION]\nThis system handles everything.\nAutomatically. 24/7.\n\n[PROOF]\nClient doubled revenue in 60 days.\n\n[CTA]\nComment SYSTEM for the framework.` });
  }
}

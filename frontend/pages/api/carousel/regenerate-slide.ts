import type { NextApiRequest, NextApiResponse } from 'next';

export const config = { maxDuration: 60 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic, slideIndex, totalSlides, currentText, style, category } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({ text: currentText || 'AI-powered systems handle this automatically.', accent_word: 'automatically' });
  }

  const total = totalSlides || 5;
  const isFirst = slideIndex === 0;
  const isLast = slideIndex === total - 1;
  const position = isFirst ? 'COVER (first slide)' : isLast ? 'CTA (last slide)' : `content slide ${slideIndex + 1} of ${total}`;

  const prompt = `You are rewriting a single Instagram carousel slide for Nick Cornelius (@thenickcornelius).

Topic: "${topic}"
Category: ${category || 'general'}
Style: ${style || 'tech_breakdown'}
Slide position: ${position}
Current text: "${currentText}"

Write a BETTER version. Rules:
- Pass the Bullshit Test: Specific numbers, novel insight, every sentence earns its place
- 2–4 sentences max. End with a kicker.
- Second person, present tense. Fragments OK.
- NEVER use: leverage, synergy, seamless, empower, unlock, revolutionize, supercharge
- Pick ONE accent_word: the most impactful concept, must appear verbatim in the text
${isFirst ? '- Cover format: Bold headline + (subtitle explaining the payoff in parentheses)' : ''}
${isLast ? '- CTA format: "Comment [KEYWORD] and I\'ll send you [specific concrete thing]"' : ''}

Return JSON only: {"text": "new slide copy", "accent_word": "word"}`;

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: 500 },
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
    return res.json({ text: currentText, accent_word: '' });
  }
}

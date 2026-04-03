import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic, slideIndex, currentText, style, category } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({ text: currentText || 'AI-powered systems handle this automatically.', accent_word: 'automatically' });
  }

  const prompt = `You are Nick Cornelius — direct AI business educator. Rewrite this Instagram carousel slide.

Topic: "${topic}"
Category: ${category}
Style: ${style}
Slide position: ${slideIndex + 1} of 5
Current text: "${currentText}"

Write a BETTER version of this slide. Rules:
- 15-40 words max
- Punchy, direct, no fluff
- Specific numbers when possible
- Sound like a smart friend sharing insider info
- Choose ONE accent_word (the most impactful word to highlight in orange)

Return JSON: {"text": "new slide copy", "accent_word": "word"}`;

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

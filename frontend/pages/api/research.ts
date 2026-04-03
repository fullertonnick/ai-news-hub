import type { NextApiRequest, NextApiResponse } from 'next';

export const config = { maxDuration: 60 };

function fallback(topic: string) {
  return {
    topic,
    timestamp: new Date().toISOString(),
    hook_options: [
      `I tested ${topic} for 30 days. Here's what actually works (and what to skip)`,
      `${topic} just changed. Here's exactly how to use it to make more money`,
      `Stop overcomplicating ${topic}. Here's the 20% that gets 80% of the results`,
    ],
    unique_angles: [
      {
        angle: `The 3-step system to make money with ${topic} this week`,
        description: `A simple, actionable playbook — pick one use case, build it in a day, charge clients for it. No tech background needed. Real examples with real dollar amounts.`,
        why_unique: `Most people talk theory. This shows the exact steps a non-technical person can follow today.`
      },
      {
        angle: `Why 90% of people waste money on ${topic} (and the fix)`,
        description: `The most common mistakes business owners make — starting too complex, wrong use cases, no measurement. Each mistake has a 1-sentence fix.`,
        why_unique: `Contrarian, specific, and solves the #1 frustration in the space.`
      },
      {
        angle: `${topic} explained like you're 10 — then how to profit from it`,
        description: `First, make it dead simple with an analogy a kid would get. Then show exactly how that translates to real business value and ROI.`,
        why_unique: `Bridges the gap between understanding and action — most educational content only does one or the other.`
      },
    ],
    business_applications: [
      `Automate your most repetitive client deliverable — save 10+ hrs/week`,
      `Build a lead qualification bot that filters tire-kickers 24/7`,
      `Create a proposal generator that cuts 45-min proposals to 4 minutes`,
    ],
    common_mistakes: [
      `Trying to automate everything at once — start with your #1 time drain`,
      `No baseline measurement — if you don't track before, you can't prove ROI`,
      `Wrong use case — AI works best on repetitive, high-volume, low-judgment tasks`,
    ],
    roadmap: [
      `Day 1: List every task you do more than 3x per week and time each one`,
      `Day 2: Pick the highest time-cost task and find one AI tool that handles it`,
      `Week 1: Build a simple test — just one task, just one client`,
      `Week 2: Measure time saved, adjust the workflow, document the system`,
    ],
    metrics: [`Hours saved per week`, `Cost per deliverable before vs after`, `Client response time improvement`, `Revenue per hour worked`],
    full_research: `This is a high-value topic for business owners. The key insight: most people overcomplicate AI implementation. The businesses winning aren't using more AI — they're using it on the right tasks. Focus on high-volume, repetitive work first. Measure everything.`,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.json(fallback(topic));

  try {
    const prompt = `You are a world-class business educator and AI strategist. Your audience: solopreneurs and agency owners who want to make money, not learn theory.

Research this topic thoroughly and completely: "${topic}"

Your job is to extract the REAL, SPECIFIC, ACTIONABLE insights — not generic advice. Think like someone who has actually implemented this and made money from it.

Requirements for each angle:
- The "angle" field must be a compelling, specific carousel title (not vague)
- The "description" field must be 2-3 sentences explaining EXACTLY what the carousel will cover and what specific examples/numbers will be used
- The "why_unique" field must explain what makes this angle different from generic content

Return ONLY valid JSON:
{
  "hook_options": [
    "hook that creates curiosity and promises specific value (example: 'I automated 15 hours of work with one Claude prompt. Here's exactly how.')",
    "hook that challenges a common belief",
    "hook that promises a simple step-by-step"
  ],
  "unique_angles": [
    {
      "angle": "Specific, compelling carousel title — not generic",
      "description": "2-3 sentences: exactly what this carousel covers, what examples/numbers it uses, who it's for",
      "why_unique": "What makes this different from the 1000 other posts about this topic"
    },
    {
      "angle": "Different angle — focus on a common mistake or misconception",
      "description": "2-3 sentences: the mistake, why people make it, the correct approach with example",
      "why_unique": "Why this resonates with people who've tried and failed"
    },
    {
      "angle": "Step-by-step implementation angle — specific to a type of business",
      "description": "2-3 sentences: the exact steps, the time/money involved, the expected result",
      "why_unique": "Why this is more actionable than what's already out there"
    }
  ],
  "business_applications": [
    "Specific application with a time/money metric (e.g., 'Replace manual proposal writing — save 45 min per client')",
    "Specific application with a time/money metric",
    "Specific application with a time/money metric"
  ],
  "common_mistakes": [
    "Specific mistake with a 1-sentence fix",
    "Specific mistake with a 1-sentence fix",
    "Specific mistake with a 1-sentence fix"
  ],
  "roadmap": [
    "Day 1: very specific first action",
    "Day 2-3: specific next steps",
    "Week 1: specific milestone to hit",
    "Week 2+: how to scale or measure"
  ],
  "metrics": ["Specific thing to measure", "Specific thing to measure", "Specific thing to measure", "Specific thing to measure"],
  "full_research": "3-4 paragraphs of deep context: what this technology/concept actually does, why it matters RIGHT NOW, the business case with real numbers, and what separates the businesses winning vs losing with it"
}`;

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      }),
    });
    const d = await r.json();
    let text = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (text.includes('```')) {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) text = match[1];
    }
    const data = JSON.parse(text.trim());
    data.topic = topic;
    data.timestamp = new Date().toISOString();
    return res.json(data);
  } catch (e) {
    console.error('Research error:', e);
    return res.json(fallback(topic));
  }
}

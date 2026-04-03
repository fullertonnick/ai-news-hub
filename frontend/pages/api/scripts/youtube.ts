import type { NextApiRequest, NextApiResponse } from 'next';

export const config = { maxDuration: 60 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic, length = 'medium (10-15 min)', hook_type = 'tutorial', primary_cta = 'Automation Academy' } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  const lengthGuide: Record<string, string> = {
    'short (5-8 min)': 'Hook: 45s | Promise: 60s | Problem: 2min | Teaching: 3-4min | Action: 60s. Single framework, 3-4 components, 2-3 client stories, single CTA.',
    'medium (10-15 min)': 'Hook: 60s | Promise: 90s | Problem: 3-4min | Teaching: 6-8min | Action: 90s. Comprehensive framework, 4-5 stories, 5-6 contrast patterns, 2 CTAs.',
    'long (15-25 min)': 'Hook: 90s | Promise: 2min | Problem: 5-8min | Teaching: 10-15min | Action: 2min. Multiple frameworks, 6-8 stories, 8-10 contrast patterns, 2-3 CTAs.',
  };

  const prompt = `You are Nick Cornelius — direct AI business educator. $70K+/month combined (KingCaller AI $50K + SimpliScale $20K). Former $55K/year pharma chemist → 7-figure entrepreneur in 4 years. 40+ employees, location-independent, lake house in Texas.

Write a complete YouTube script about: "${topic}"

VIDEO LENGTH: ${length}
TIMING: ${lengthGuide[length] || lengthGuide['medium (10-15 min)']}
HOOK TYPE: ${hook_type}
PRIMARY CTA: ${primary_cta}

USE THE 5-PHASE FRAMEWORK:

PHASE 1 — DISRUPTION (Hook, 45-90s):
Opening: "What's going on guys, my name is Nick Cornelius, and in this video I'm going to [ACTION] you [OUTCOME]..."
Hook type ${hook_type}: ${hook_type === 'tutorial' ? 'Show exact system/method for specific outcome' : hook_type === 'industry analysis' ? 'Something is dead/dying/changing + what replaces it' : hook_type === 'results reveal' ? 'Just achieved specific result, here is exactly how' : hook_type === 'problem-solution' ? 'If you have this problem, this solves it permanently' : 'Popular belief is wrong, here is proof'}

PHASE 2 — DECLARATION (Promise, 60-120s):
"In this video, I'm going to show you THREE critical things:
FIRST: [mindset/framework shift]
SECOND: [tactical process/system]
THIRD: [implementation/tools/action steps]"
Then: "Now, these concepts are [simple]. The hard part isn't [learning]. The hard part is [specific implementation challenge]."

PHASE 3 — DIAGNOSIS (Problem, 2-10min):
Layer 1: Surface problem. "You think your problem is [surface issue]..."
Layer 2: Root cause. "But here's what's really happening..."
Layer 3: Cost calculation. "Here's what this is actually costing you..."

PHASE 4 — DOWNLOAD (Teaching, majority of video):
- Name the framework (professional 2-4 word name)
- Break into 3-5 components, each with: definition, implementation steps, real-world example with numbers, common mistakes
- Include client stories: "[Client] was [situation], implemented [component], result: [specific numbers]"
- Include contrast patterns: "Most people [wrong]. Winners [right]."
- Mid-video CTA at 60-70%: "${primary_cta}" pitch
- Audience check-ins every 2-3 min: "Is this making sense?" / "Are you tracking?"

PHASE 5 — DIRECTIVE (Implementation, 60-120s):
- Conviction statement: "Here's what I believe..."
- Implementation challenge: "In the next [timeframe], [specific first action]..."
- 3 pathway options: DIY, platform/tool, done-for-you
- Final: "Hope this blessed you. Smash that like button, subscribe. Until next time. Stay blessed with success."

VOICE RULES:
- 8-15 words per sentence max (prefer 8-12)
- 3-5 sentence paragraphs
- High energy throughout, 180-200+ WPM delivery pace
- Peer-to-peer (never guru), direct experience only
- Zero fluff: every sentence serves conversion or education
- Specific numbers from real business operations
- Use 1-2 word emphasis: "Stop." "Listen." "Reality."

Return the complete script as plain text with phase headers. Return in JSON: {"script": "..."}`;

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.78, maxOutputTokens: 8000 },
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
    return res.json({ script: 'Script generation failed. Check your GEMINI_API_KEY in Vercel environment variables.' });
  }
}

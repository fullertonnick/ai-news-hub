import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic, platform } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  const platformFocus = platform ? `Focus ideas specifically on the ${platform.replace('_', ' ')} platform format.` : 'Generate ideas across multiple platforms: instagram_carousel, instagram_reel, x, youtube, linkedin.';

  const prompt = `You are a content strategist for Nick Cornelius (@thenickcornelius), an AI business educator earning $70K+/month from KingCaller AI + SimpliScale.

Generate exactly 5 content ideas${topic ? ` about "${topic}"` : ' about trending AI/automation topics for business owners'}.

${platformFocus}

Each idea must:
- Have a scroll-stopping title (5-10 words, punchy)
- Include a 1-2 sentence description of the angle
- Specify which platform it's best for
- Be based on real AI/automation trends, not generic motivation
- Connect to Nick's authority (real results, client transformations, specific tools)

Content pillars to draw from:
- Claude Code, Anthropic, MCP servers
- Make.com, N8N, Zapier automations
- AI agents, autonomous workflows
- Business automation ROI, scaling without hiring
- AI voice agents (KingCaller)
- Tool comparisons, workflow breakdowns

Return JSON: {"ideas": [{"title": "...", "description": "...", "platform": "instagram_carousel|instagram_reel|x|youtube|linkedin"}]}`;

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 2000 },
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
    return res.json({
      ideas: [
        { title: 'Claude Code CLAUDE.md secrets nobody shares', description: 'Break down the exact memory file structure that makes Claude Code 10x more useful', platform: 'instagram_carousel' },
        { title: 'I replaced my VA with a Make.com scenario', description: 'Show the exact automation that handles client onboarding without human touch', platform: 'instagram_reel' },
        { title: 'AI agents are dead in 2026 — here\'s what replaces them', description: 'Contrarian take on why single-purpose tools beat complex agent architectures', platform: 'youtube' },
        { title: 'The $70K/month AI stack nobody talks about', description: 'Reveal the exact tools running KingCaller + SimpliScale behind the scenes', platform: 'x' },
        { title: 'Stop hiring. Start automating. Here\'s how.', description: 'Framework for identifying which roles to replace with AI vs which to keep human', platform: 'linkedin' },
      ],
    });
  }
}

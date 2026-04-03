import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic, platform } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;

  const platformFocus = platform ? `Focus ideas specifically on the ${platform.replace(/_/g, ' ')} platform format.` : 'Generate ideas across multiple platforms: instagram_carousel, instagram_reel, x, youtube, linkedin.';

  const prompt = `You are the content strategist for Nick Cornelius (@thenickcornelius / SimpliScale). Nick earns $70K+/month from KingCaller AI ($50K/mo AI sales automation) + SimpliScale ($20K/mo custom AI builds for service businesses). Former pharma chemist → 7-figure in 4 years.

Generate exactly 5 content ideas${topic ? ` related to "${topic}"` : ''}.

${platformFocus}

WHAT MAKES NICK'S BEST CONTENT WORK:
- SHOWS the actual tool, prompt, or workflow — not just talks about it
- Teaches something the viewer can implement TODAY
- Uses real numbers from Nick's businesses or clients
- Has a specific, tangible deliverable as the CTA
- Takes a contrarian angle OR reveals a hidden feature/technique

PROVEN CONTENT ANGLES (use these as inspiration, don't copy literally):
- "I replaced [expensive thing] with [AI tool]. Here's the exact setup."
- "[Tool] has a feature nobody uses. It saves me [hours]/week."
- "Stop [common mistake]. Do [counterintuitive thing] instead."
- "I built [system] in [timeframe]. Here's every step."
- "[Number] things I'd automate first if I were starting over"
- "My exact [tool] setup that handles [function] while I sleep"
- "The prompt I use to [specific business outcome]"
- "This [tool] workflow replaced a $[amount]/year employee"

TOOLS NICK USES DAILY (reference these specifically):
- Claude Code (Anthropic) — agentic coding, CLAUDE.md memory, MCP servers
- Make.com — visual workflow automation, client onboarding, reporting
- GoHighLevel — CRM, pipeline management, client communication
- KingCaller AI (his own product) — AI voice agents for sales teams
- OpenClaw — custom AI assistant platform
- N8N — self-hosted workflow automation

EACH IDEA MUST INCLUDE:
1. title: Scroll-stopping hook (5-10 words). Must promise a SPECIFIC reveal, not vague value.
2. description: 2 sentences. What exact thing will you show/teach? What's the payoff for the viewer?
3. platform: Best platform for this idea.

BAD TITLES (too vague): "AI Tools That Will Change Everything" / "Why You Need Automation" / "The Future of Business"
GOOD TITLES (specific): "The Claude Code prompt that writes my proposals" / "I automated client onboarding in 90 minutes with Make.com" / "3 MCP servers every developer should install today"

Return JSON: {"ideas": [{"title": "...", "description": "...", "platform": "instagram_carousel|instagram_reel|x|youtube|linkedin"}]}`;

  if (!apiKey) {
    // Solid fallback ideas
    return res.json({
      ideas: [
        { title: 'The Claude Code prompt that writes my proposals', description: 'Show the exact CLAUDE.md setup and the one command that generates client proposals in 3 minutes. Include the before (2 hours manual) vs after comparison.', platform: 'instagram_carousel' },
        { title: 'I automated client onboarding with Make.com in 90 minutes', description: 'Step-by-step breakdown of the 4-module Make.com scenario that takes a new client from form submission to fully onboarded — emails, Slack notifications, CRM entry, and welcome sequence.', platform: 'instagram_reel' },
        { title: 'My $70K/month AI stack costs less than one employee', description: 'Full tool-by-tool breakdown of everything running KingCaller + SimpliScale. Show exact costs, what each tool does, and why most people overpay for tools they don\'t need.', platform: 'youtube' },
        { title: 'Stop building AI agents. Build workflows instead.', description: 'Contrarian take: most businesses don\'t need autonomous agents — they need deterministic workflows with AI steps. Show the Make.com + Claude API pattern that\'s 10x more reliable.', platform: 'x' },
        { title: '3 MCP servers that made Claude Code actually useful', description: 'Most developers install Claude Code and underuse it. These 3 MCP servers (filesystem, web search, database) turn it from a chatbot into a full development environment.', platform: 'linkedin' },
      ],
    });
  }

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 3000 },
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
        { title: 'The Claude Code prompt that writes my proposals', description: 'Show the exact CLAUDE.md setup and the one command that generates client proposals in 3 minutes.', platform: 'instagram_carousel' },
        { title: 'I automated client onboarding with Make.com in 90 minutes', description: 'Step-by-step: 4-module Make.com scenario from form to fully onboarded client.', platform: 'instagram_reel' },
        { title: 'My $70K/month stack costs less than one employee', description: 'Full tool-by-tool breakdown of everything running KingCaller + SimpliScale.', platform: 'youtube' },
        { title: 'Stop building AI agents. Build workflows instead.', description: 'Contrarian: most businesses need deterministic workflows with AI steps, not autonomous agents.', platform: 'x' },
        { title: '3 MCP servers that made Claude Code actually useful', description: 'These 3 MCP servers turn Claude Code from a chatbot into a full dev environment.', platform: 'linkedin' },
      ],
    });
  }
}

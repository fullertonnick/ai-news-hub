import type { NextApiRequest, NextApiResponse } from 'next';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function detectCategory(topic: string): string {
  const t = topic.toLowerCase();
  if (/claude(?!\s*van|\s*monet)/i.test(t) || /anthropic|mcp\b|claude code/.test(t)) return 'claude-code';
  if (/make\.com|\bmake\b|n8n|zapier|integromat|workflow|automat|onboard/.test(t)) return 'make-automation';
  if (/\bagent\b|\bagents\b|multi.agent|autonomous|agentic/.test(t)) return 'ai-agents';
  return 'business-ai';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic, style = 'tech_breakdown', research_context } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });

  const apiKey = process.env.GEMINI_API_KEY;
  const category = detectCategory(topic);

  const prompt = `You are Nick Cornelius (@thenickcornelius) — direct AI business educator. $70K+/month from KingCaller AI ($50K) + SimpliScale ($20K). Former $55K/year pharma chemist → 7-figure entrepreneur in 4 years. 40+ employees, location-independent.

You create Instagram carousels for the SimpliScale brand. Your voice is: direct, no-fluff, high-energy, authority-driven, peer-to-peer. You never position as a guru — always entrepreneur sharing with entrepreneurs. You speak only from direct experience.

Create a ${style === 'use_case_list' ? '5-slide USE CASE' : style === 'prompt_reveal' ? '5-slide PROMPT REVEAL' : '5-slide BREAKDOWN'} Instagram carousel about: "${topic}"

Category: ${category}
${research_context?.full_research ? `Research context:\n${research_context.full_research.slice(0, 2000)}` : ''}

BRAND VOICE RULES:
- Headlines: 3-7 words max, punchy. One accent word per headline gets highlighted orange.
- Body: 15-40 words per slide max. Less is more.
- NEVER use: leverage, utilize, synergy, game-changer, revolutionary, paradigm, cutting-edge
- Specific numbers always — never vague claims
- Sound like a smart friend giving insider info
- Every sentence must serve conversion or education

SLIDE STRUCTURE:
Slide 1 (COVER): Bold scroll-stopping headline (4-8 words). Use one of these formulas:
  - "Stop [Old Behavior]. [Tool] Does It In [Time]."
  - "How I [Result] Using Only [Tool]"
  - "The [AI Thing] Nobody Is Talking About"
  - "[Number] [Tool] [Things] That [Transform] in [Timeframe]"

Slides 2-4 (CONTENT): Each slide has ONE clear idea. Suggest a visual_type for each:
  - code_block: for prompts, commands, technical content
  - stats_grid: for data/metrics (4 stats with icon, value, label)
  - steps_list: for numbered action steps (3 steps with title + description)
  - diagram: for workflows/processes (3 nodes: input → process → output)
  - big_quote: for a powerful standalone quote
  - comparison: for before/after (5 items each side)
  - skill_card: for featuring a specific tool
  - checklist: for a list of items with checkmarks
  - none: for text-only slides

Slide 5 (CTA): "Want [specific deliverable]?" format.
  - Choose a KEYWORD: the main tool/subject (max 8 chars, ALL CAPS)
  - Never use stop words as keyword (WILL, HOW, THE, etc.)
  - Tool names always win: claude → CLAUDE, make.com → MAKE

Also generate:
- Instagram caption: strong hook, 4 bullets with →, CTA with keyword, 📌 save, 20 hashtags
- The keyword for the CTA

Return ONLY valid JSON:
{
  "slides": [
    { "text": "slide copy", "accent_word": "one word", "section_label": "optional label or null", "visual_type": "cover_photo|code_block|stats_grid|etc." }
  ],
  "caption": "full Instagram caption",
  "keyword": "KEYWORD",
  "category": "${category}"
}

CRITICAL: slides[0].visual_type MUST be "cover_photo". slides[4].visual_type MUST be "cta_slide". Generate exactly 5 slides.`;

  if (!apiKey) {
    // Fallback — hardcoded
    return res.json({
      slides: [
        { id: uid(), text: `Stop Guessing. ${topic.split(/\s+/).slice(0, 2).join(' ')} Handles It.`, accent_word: 'Handles', visual_type: 'cover_photo', backgroundStatus: 'pending' },
        { id: uid(), text: `Most business owners waste 10+ hours a week on tasks AI can handle in minutes. Here's the system that changes everything.`, accent_word: 'system', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `The results speak for themselves. Real numbers from real businesses.`, accent_word: 'results', visual_type: 'stats_grid', backgroundStatus: 'pending' },
        { id: uid(), text: `Start implementing this week — step by step:`, accent_word: 'week', visual_type: 'steps_list', section_label: '— Your Action Plan —', backgroundStatus: 'pending' },
        { id: uid(), text: 'Want the Full Implementation Guide?', accent_word: 'Full', visual_type: 'cta_slide', backgroundStatus: 'pending' },
      ],
      caption: `Your competitors are already using ${topic}. Here's the playbook.\n\n→ The system that replaces manual work\n→ Real numbers from businesses using it\n→ Step-by-step implementation guide\n→ The one mistake to avoid\n\nComment "GUIDE" and I'll send you the complete guide 🔥\n\n📌 Save this before you lose it`,
      keyword: 'GUIDE',
      category,
    });
  }

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 8000 },
      }),
    });
    const d = await r.json();
    let text = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (text.includes('```')) {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) text = match[1];
    }
    const parsed = JSON.parse(text.trim());

    // Add IDs and backgroundStatus to each slide
    const slides = (parsed.slides || []).map((s: any) => ({
      ...s, id: uid(), backgroundStatus: 'pending' as const,
    }));

    return res.json({ slides, caption: parsed.caption || '', keyword: parsed.keyword || 'GUIDE', category });
  } catch (err) {
    console.error('Generate copy error:', err);
    return res.status(500).json({ error: 'Copy generation failed' });
  }
}

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

  const prompt = `You are writing Instagram carousel slides for Nick Cornelius (@thenickcornelius / SimpliScale).

NICK'S PROFILE: Former $55K/year pharmaceutical chemist → 7-figure entrepreneur in 4 years. Runs KingCaller AI ($50K/mo) and SimpliScale ($20K/mo). 40+ employees, location-independent. Teaches business owners to implement AI and automation — from direct experience, never theory.

TOPIC: "${topic}"
CATEGORY: ${category}
FORMAT: ${style}
${research_context?.full_research ? `\nRESEARCH:\n${research_context.full_research.slice(0, 3000)}` : ''}

═══════════════════════════════════════════════════════
COPY STYLE — EDUCATION-FIRST, PRACTICAL, TECHNICAL
═══════════════════════════════════════════════════════

Write like you're teaching a capable business owner exactly HOW to do something — not selling them on WHY they should care. Every slide must teach, reveal, or demonstrate. Zero filler.

VOICE RULES:
• Direct and practical — "Here's how this works" not "This could potentially help"
• Show the EXACT process, tool, or prompt — don't describe it vaguely
• Use specific numbers from real scenarios (hours saved, revenue impact, cost reduction)
• Sound like a technical friend giving you the actual playbook, not a marketer
• Short sentences. Max 12 words each. Many under 6 words.
• One clear takeaway per slide — if you can't summarize the slide in 5 words, it's too complex
• Never use: leverage, utilize, synergy, game-changer, revolutionary, paradigm, cutting-edge, hack
• Never hedge: no "might", "could", "probably", "I think"

SLIDE COPY PATTERNS THAT WORK:

Cover slide patterns:
  "I [did specific thing] using [specific tool]. Here's the exact setup."
  "[Number] [specific tools/prompts/steps] that replaced [expensive/slow thing]"
  "The [tool] setup that runs [business function] while I sleep"
  "How [tool] handles [boring task] in [timeframe] — step by step"

Content slide patterns:
  "Step 1: [Specific action verb + what exactly to do]"
  "[Before state] → [Tool/Action] → [After state with number]"
  "Most people [wrong approach]. Here's what actually works:"
  "The prompt: [Show the actual prompt or command, verbatim]"
  "Result: [Specific metric] in [specific timeframe]"

CTA slide patterns:
  "Want the exact [template/prompt pack/blueprint]?"
  "I packaged this into a [specific deliverable]. Comment [KEYWORD]."

═══════════════════════════════════════════════════════
STRUCTURE — 5 SLIDES
═══════════════════════════════════════════════════════

SLIDE 1 (COVER): 4-8 word hook. Must create curiosity about a SPECIFIC outcome or reveal. Not generic motivation. Include what tool/system and what result.

SLIDE 2 (THE HOOK): Set up the problem OR reveal the key insight. 15-30 words max. Make the reader feel "I need to know this." Include one surprising data point or contrarian truth.

SLIDE 3 (THE MEAT): The actual HOW. Show the process, the prompt, the workflow, or the data. This is the slide people screenshot. 20-40 words. Be technical but clear. Suggest the right visual_type:
  - code_block: if showing a prompt, command, or template
  - steps_list: if showing a numbered process (3 steps max)
  - stats_grid: if showing measurable results (4 metrics)
  - diagram: if showing a workflow (input → process → output)
  - comparison: if showing before/after (5 items each)
  - checklist: if showing a list of requirements or features
  - skill_card: if featuring a specific tool with rating
  - big_quote: if one powerful statement carries the slide

SLIDE 4 (THE PROOF): Results, implementation timeline, or the "what happens next" step. 15-30 words. Specific numbers. Show that this isn't theory — it's been done. Or: give the next action step.

SLIDE 5 (CTA): "Want the exact [deliverable]?" + keyword. Keep it to one sentence + the keyword.

KEYWORD: Pick the most memorable tool name or action word from the topic. Max 8 chars. ALL CAPS. Tool names win: CLAUDE, MAKE, AGENT, etc. NEVER use stop words (THE, HOW, WILL, etc).

CAPTION: Write a strong Instagram caption:
  - Hook: 1 sentence that stops the scroll (match cover energy)
  - 4 bullets starting with → that preview each slide's value
  - CTA: Comment "[KEYWORD]" and I'll send you the [specific deliverable] 🔥
  - 📌 Save this before you lose it
  - 15-20 relevant hashtags

═══════════════════════════════════════════════════════

Return ONLY valid JSON (no markdown, no backticks wrapping the JSON):
{
  "slides": [
    { "text": "slide copy here", "accent_word": "single highest-impact word", "section_label": null, "visual_type": "cover_photo" },
    { "text": "...", "accent_word": "...", "section_label": null, "visual_type": "none|code_block|stats_grid|etc" },
    { "text": "...", "accent_word": "...", "section_label": null, "visual_type": "..." },
    { "text": "...", "accent_word": "...", "section_label": null, "visual_type": "..." },
    { "text": "...", "accent_word": "...", "section_label": null, "visual_type": "cta_slide" }
  ],
  "caption": "full caption",
  "keyword": "KEYWORD"
}`;

  if (!apiKey) {
    // Fallback — education-first, practical copy
    const toolName = /claude/i.test(topic) ? 'Claude Code' : /make/i.test(topic) ? 'Make.com' : /agent/i.test(topic) ? 'AI Agents' : 'AI';
    const kw = /claude/i.test(topic) ? 'CLAUDE' : /make/i.test(topic) ? 'MAKE' : /agent/i.test(topic) ? 'AGENT' : 'GUIDE';
    return res.json({
      slides: [
        { id: uid(), text: `I automated ${topic.split(/\s+/).slice(0, 3).join(' ').toLowerCase()} with ${toolName}. Here's the exact setup.`, accent_word: 'exact', visual_type: 'cover_photo', backgroundStatus: 'pending' },
        { id: uid(), text: `Most people overcomplicate this. The entire system is 3 steps and takes under 2 hours to build. No code required.`, accent_word: 'overcomplicate', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `Step 1: Map your highest-volume repeating task.\nStep 2: Build the trigger + 3 core modules.\nStep 3: Test with one real scenario before scaling.`, accent_word: 'trigger', visual_type: 'steps_list', section_label: '— The Build —', backgroundStatus: 'pending' },
        { id: uid(), text: `Result: 12 hrs/week saved. 94% fewer manual errors. ROI positive in 8 days. Running 24/7 since March.`, accent_word: 'saved', visual_type: 'stats_grid', backgroundStatus: 'pending' },
        { id: uid(), text: `Want the exact blueprint + templates?`, accent_word: 'exact', visual_type: 'cta_slide', backgroundStatus: 'pending' },
      ],
      caption: `I just automated ${topic.toLowerCase()} — and the setup took less than 2 hours.\n\nHere's everything I used:\n\n→ The 3-step build process (no code)\n→ The exact modules and triggers\n→ Real results: 12 hrs/week saved, 94% fewer errors\n→ How to test before you scale\n\nComment "${kw}" and I'll send you the complete blueprint + templates 🔥\n\n📌 Save this before you lose it\n\n#aiautomation #${toolName.replace(/[.\s]/g, '').toLowerCase()} #automation #aiforbusiness #nocode #businessautomation #solopreneur #agencyowner #scaleyourbusiness #simpliscale #thenickcornelius #productivitytools #workflowautomation #businessgrowth #entrepreneurship`,
      keyword: kw,
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
    const slides = (parsed.slides || []).map((s: any) => ({
      ...s, id: uid(), backgroundStatus: 'pending' as const,
    }));
    return res.json({ slides, caption: parsed.caption || '', keyword: parsed.keyword || 'GUIDE', category });
  } catch (err) {
    console.error('Generate copy error:', err);
    return res.status(500).json({ error: 'Copy generation failed' });
  }
}

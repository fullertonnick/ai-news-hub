import type { NextApiRequest, NextApiResponse } from 'next';

export const config = { maxDuration: 60 };

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

  // ─── Tyler Germain-style prompt ─────────────────────────────────────────────
  const prompt = `You are writing an Instagram carousel for Nick Cornelius (@thenickcornelius).

TOPIC: "${topic}"
${research_context?.full_research ? `\nRESEARCH:\n${research_context.full_research.slice(0, 3000)}` : ''}

═══════════════════════════════════════════════════════
STYLE REFERENCE: TYLER GERMAIN (@itstylergermain)
═══════════════════════════════════════════════════════

Study this example carousel by Tyler Germain. Your output must match this EXACT writing style:

COVER: "How to Build an AI Operating System (that runs your business for you...)"

SLIDE 2: "Level 1: Claude Chat.
You open a browser, type a question, get an answer. No memory. No context. You start from zero every single time.
This is where 99% of people stop."

SLIDE 3: "Level 2: Claude Code with a CLAUDE.md.
Now Claude knows who you are, what you do, and how you like things done. It remembers your rules, your tone, your preferences.
You stop repeating yourself."

SLIDE 4: "Level 3: Claude Code with skills.
Each skill is a focused expert. One writes ads. One designs emails. One builds websites.
You're not prompting anymore. You're delegating."

SLIDE 5: "Level 4: Multiple Claude Code instances, each with different skills.
One handles marketing. Another handles sales. Another handles operations.
You now have a team. But you're still the one starting every session."

SLIDE 6: "Level 5: A harness connecting all of them.
Heartbeats. Mission control. Agent-to-agent communication. Skill discovery. Agents that find and use each other's skills automatically.
This is an AI operating system."

CTA: "Want to skip straight to Level 5?
I teach all of this inside AI Innovators. Comment 'AIOS' for an invite."

═══════════════════════════════════════════════════════
WHAT MAKES THIS STYLE WORK — COPY THESE PATTERNS:
═══════════════════════════════════════════════════════

1. PROGRESSIVE STRUCTURE: Each slide builds on the previous. "Level 1 → Level 2 → Level 3..." or "Step 1 → Step 2 → Step 3..." — a journey, not random tips.

2. CONVERSATIONAL NARRATIVE: Reads like you're explaining to one smart friend. "You open a browser, type a question, get an answer." Second person, present tense.

3. SHORT PUNCHY SENTENCES: Many under 6 words. "No memory. No context." "You stop repeating yourself." Fragment sentences for impact.

4. EACH SLIDE ENDS WITH A KICKER: The last sentence is the emotional payoff or realization. "This is where 99% of people stop." "You're not prompting anymore. You're delegating." "This is an AI operating system."

5. CONCRETE OVER ABSTRACT: "One writes ads. One designs emails. One builds websites." NOT "AI can help with various business tasks."

6. NO MARKETING SPEAK: Zero buzzwords. No "revolutionary", "game-changing", "leverage". Plain language that a 14-year-old would understand.

7. BUILDS TENSION: Each level reveals something bigger. The reader feels "I need to get to the next level."

8. ACCENT WORD: One key phrase per slide gets highlighted (underlined in orange). It's the concept being introduced — "Claude Chat", "CLAUDE.md", "skills", "Multiple Claude Code instances", "harness connecting all of them".

═══════════════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════════════

Write a 7-slide carousel about "${topic}" using Nick's perspective (he runs KingCaller AI + SimpliScale, $70K+/month, former pharma chemist).

SLIDE 1 (COVER): Big bold title + subtitle in parentheses. The title names the concept. The subtitle teases the outcome.

SLIDES 2-6 (CONTENT): Progressive levels/steps. Each slide:
- Opens with "Level X:" or "Step X:" + the key concept (this becomes accent_word)
- 2-4 sentences of conversational explanation (concrete, specific, second person)
- Ends with a kicker line that creates anticipation for the next slide
- visual_type: "none" (pure text on dark background — this is the style)

SLIDE 7 (CTA):
- Question that references the highest level: "Want to skip straight to Level X?"
- One-line offer: "I teach all of this inside [Automation Academy / SimpliScale]."
- "Comment '[KEYWORD]' for [invite/access/the blueprint]."

KEYWORD: Pick from the topic. Max 8 chars. ALL CAPS. Tool names win.

CAPTION: Write conversational Instagram caption:
- Hook matching the cover energy
- 4 bullets with → previewing each level
- "Comment [KEYWORD] and I'll send you [specific thing] 🔥"
- "📌 Save this before you lose it"
- 15-20 hashtags

Return ONLY valid JSON (no markdown wrapping):
{
  "slides": [
    { "text": "slide copy", "accent_word": "key phrase to highlight", "section_label": null, "visual_type": "cover_photo" },
    { "text": "Level 1: ...", "accent_word": "...", "section_label": null, "visual_type": "none" },
    { "text": "Level 2: ...", "accent_word": "...", "section_label": null, "visual_type": "none" },
    { "text": "Level 3: ...", "accent_word": "...", "section_label": null, "visual_type": "none" },
    { "text": "Level 4: ...", "accent_word": "...", "section_label": null, "visual_type": "none" },
    { "text": "Level 5: ...", "accent_word": "...", "section_label": null, "visual_type": "none" },
    { "text": "CTA text", "accent_word": "...", "section_label": null, "visual_type": "cta_slide" }
  ],
  "caption": "full caption",
  "keyword": "KEYWORD"
}`;

  if (!apiKey) {
    // Tyler Germain-style fallback
    const kw = /claude/i.test(topic) ? 'CLAUDE' : /make/i.test(topic) ? 'MAKE' : /agent/i.test(topic) ? 'AGENT' : 'BUILD';
    return res.json({
      slides: [
        { id: uid(), text: `How to ${topic.split(/\s+/).slice(0, 5).join(' ')}\n\n(the system that runs itself...)`, accent_word: topic.split(/\s+/)[0], visual_type: 'cover_photo', backgroundStatus: 'pending' },
        { id: uid(), text: `Level 1: The manual version.\n\nYou do everything yourself. Every task, every follow-up, every report. You're fast, but you're the bottleneck.\n\nNothing runs without you.`, accent_word: 'manual version', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `Level 2: One AI tool.\n\nYou find one tool that handles one task. It's faster than you. It doesn't forget. It doesn't sleep.\n\nBut it only does one thing.`, accent_word: 'One AI tool', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `Level 3: Connected tools.\n\nNow your tools talk to each other. A new lead triggers onboarding. Onboarding triggers a Slack message. The message triggers a follow-up.\n\nYou built a machine.`, accent_word: 'Connected tools', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `Level 4: AI making decisions.\n\nThe system doesn't just run. It thinks. It scores leads. It routes conversations. It escalates problems.\n\nYou're not managing tasks anymore. You're managing outcomes.`, accent_word: 'AI making decisions', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `Level 5: The system runs itself.\n\nIt monitors its own performance. It flags what's broken. It suggests what to build next.\n\nYou check in once a day. Everything else is handled.`, accent_word: 'runs itself', visual_type: 'none', backgroundStatus: 'pending' },
        { id: uid(), text: `Want to skip straight to Level 5?\n\nI built this exact system for my businesses. Comment "${kw}" and I'll send you the blueprint.`, accent_word: 'Level 5', visual_type: 'cta_slide', backgroundStatus: 'pending' },
      ],
      caption: `Most people are stuck at Level 1.\n\nThey do everything manually. Every task, every follow-up, every report.\n\nHere's the 5-level system I used to go from doing everything myself to checking in once a day:\n\n→ Level 1: Manual everything (this is where most stop)\n→ Level 2: One AI tool doing one job\n→ Level 3: Tools connected into a machine\n→ Level 4: AI making decisions for you\n→ Level 5: The system runs itself\n\nComment "${kw}" and I'll send you the full blueprint 🔥\n\n📌 Save this before you lose it\n\n#aiautomation #automation #aiforbusiness #nocode #businessautomation #solopreneur #agencyowner #scaleyourbusiness #simpliscale #thenickcornelius #productivitytools #workflowautomation #businessgrowth #entrepreneurship #claudecode`,
      keyword: kw,
      category,
    });
  }

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
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
    return res.json({ slides, caption: parsed.caption || '', keyword: parsed.keyword || 'BUILD', category });
  } catch (err) {
    console.error('Generate copy error:', err);
    return res.status(500).json({ error: 'Copy generation failed' });
  }
}

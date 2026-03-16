import os
import json
from datetime import datetime, timezone

def get_fallback_carousel(topic: str, style: str) -> dict:
    if style == 'use_case_list':
        slides = [
            {"text": f"5 ways {topic} is replacing expensive agency work in 2025", "visual": {"type": "none"}},
            {"text": "Client reporting that used to take 4 hours now takes 8 minutes", "visual": {"type": "stats_grid", "stats": [{"icon": "⏱", "value": "8 min", "label": "vs 4 hrs"}, {"icon": "💰", "value": "87%", "label": "Cost cut"}, {"icon": "📊", "value": "3x", "label": "Output"}, {"icon": "🤖", "value": "100%", "label": "Automated"}]}},
            {"text": "Lead qualification runs 24/7 without a VA on payroll", "visual": {"type": "steps_list", "steps": [{"number": "1", "title": "Lead fills form", "desc": "Captured automatically"}, {"number": "2", "title": "AI scores & qualifies", "desc": "Under 60 seconds"}, {"number": "3", "title": "Hot leads alerted", "desc": "You close, not filter"}]}},
            {"text": "Proposal generation: 45 minutes down to 4. Same quality. Better conversion.", "visual": {"type": "none"}},
            {"text": "The businesses winning with AI aren't using it more. They're using it smarter.\n\nFollow @thenickcornelius for the playbook.", "visual": {"type": "none"}},
        ]
    elif style == 'prompt_reveal':
        slides = [
            {"text": f"The exact prompt I use for {topic} (copy this)", "visual": {"type": "none"}},
            {"text": "Step 1: Give it context about your business", "visual": {"type": "code_block", "language": "prompt", "code": f'You are an expert in {topic}.\nMy business: [describe yours]\nGoal: [specific outcome]\nConstraints: [budget/time/tools]'}},
            {"text": "Step 2: Ask for the specific output you need", "visual": {"type": "code_block", "language": "prompt", "code": 'Give me:\n1. A step-by-step action plan\n2. The 3 highest-ROI moves first\n3. Exact tools and costs\n4. What to measure in week 1'}},
            {"text": "Step 3: Iterate with real data", "visual": {"type": "steps_list", "steps": [{"number": "1", "title": "Run the prompt", "desc": "Get your first output"}, {"number": "2", "title": "Test with real work", "desc": "One task, 3 days"}, {"number": "3", "title": "Feed results back", "desc": "Ask it to improve the plan"}]}},
            {"text": "Prompting isn't magic. It's a skill. And skills compound.\n\nFollow @thenickcornelius for weekly AI systems.", "visual": {"type": "none"}},
        ]
    else:  # tech_breakdown
        slides = [
            {"text": f"{topic} explained simply — and why it matters for your bottom line", "visual": {"type": "none"}},
            {"text": "Here's how the technology actually works (no PhD required)", "visual": {"type": "diagram", "title": "How It Works", "nodes": [{"id": "input", "label": "Your Input", "type": "input"}, {"id": "process", "label": f"{topic[:20]}", "type": "process"}, {"id": "output", "label": "Your Output", "type": "output"}], "edges": [{"from": "input", "to": "process"}, {"from": "process", "to": "output"}]}},
            {"text": "The businesses using this are seeing real numbers", "visual": {"type": "stats_grid", "stats": [{"icon": "📈", "value": "3.2x", "label": "Avg ROI"}, {"icon": "⏱", "value": "15h", "label": "Saved/week"}, {"icon": "💸", "value": "67%", "label": "Cost down"}, {"icon": "🚀", "value": "2 wks", "label": "To results"}]}},
            {"text": "How to implement this in your business this week", "visual": {"type": "steps_list", "steps": [{"number": "1", "title": "Pick one process", "desc": "Start with highest time cost"}, {"number": "2", "title": "Build a simple test", "desc": "No perfect setup needed"}, {"number": "3", "title": "Measure and scale", "desc": "Data > opinions"}]}},
            {"text": "The window to get ahead with AI is still open.\n\nBut not for long.\n\nFollow @thenickcornelius to stay ahead.", "visual": {"type": "none"}},
        ]

    return {
        "topic": topic,
        "style": style,
        "slides": slides,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

async def generate_carousel(topic: str, style: str = 'tech_breakdown', custom_angle: str = None) -> dict:
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return get_fallback_carousel(topic, style)

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')

        angle_note = f'Specific angle to use: "{custom_angle}"' if custom_angle else ''
        style_note = {
            'tech_breakdown': 'Explain the technology, show how it works, give business stats, show implementation steps',
            'use_case_list': 'Show 5 specific use cases with before/after results and concrete numbers',
            'prompt_reveal': 'Reveal the exact prompts/systems to use, with code blocks showing the actual prompts',
        }.get(style, '')

        prompt = f"""Create a 5-slide Instagram carousel about "{topic}" for a solopreneur/agency owner audience.
Style: {style} — {style_note}
{angle_note}

Voice rules:
- Direct, no-BS, ROI-focused
- Specific numbers always ("15+ hrs saved" not "save time")
- Authority from experience, not theory
- Last slide always ends with "Follow @thenickcornelius"

Return ONLY valid JSON:
{{
  "slides": [
    {{
      "text": "slide text (max 120 chars, punchy, bold statement)",
      "visual": {{
        "type": "code_block|stats_grid|diagram|steps_list|none",
        // for code_block: "language": "python|javascript|prompt", "code": "actual code"
        // for stats_grid: "stats": [{{"icon":"emoji","value":"number","label":"label"}}] (4 items)
        // for diagram: "title":"title", "nodes":[{{"id":"id","label":"label","type":"input|process|output"}}], "edges":[{{"from":"id","to":"id"}}]
        // for steps_list: "steps":[{{"number":"1","title":"title","desc":"desc"}}] (3 items)
        // for none: just {{"type":"none"}}
      }}
    }}
  ]
}}

Use visuals for slides 2-4. Slide 1 and 5 should have type "none". Make each slide standalone and punchy."""

        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith('```'):
            text = text.split('```')[1]
            if text.startswith('json'): text = text[4:]
        data = json.loads(text)
        data['topic'] = topic
        data['style'] = style
        data['generated_at'] = datetime.now(timezone.utc).isoformat()
        if not data.get('slides') or len(data['slides']) < 3:
            raise ValueError("Not enough slides")
        return data
    except Exception as e:
        print(f"Gemini carousel error: {e}")
        return get_fallback_carousel(topic, style)

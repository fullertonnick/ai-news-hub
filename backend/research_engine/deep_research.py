import os
import json
from datetime import datetime, timezone

def get_fallback_research(topic: str) -> dict:
    return {
        "topic": topic,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "hook_options": [
            f"Most people are sleeping on {topic} — here's what they're missing",
            f"I spent 30 days testing {topic} so you don't have to",
            f"The {topic} playbook that's actually working in 2025",
        ],
        "unique_angles": [
            {"angle": f"The ROI case for {topic} in 90 days", "description": "Concrete numbers-first breakdown", "why_unique": "Most content lacks specific metrics"},
            {"angle": f"Why {topic} fails for most businesses (and how to fix it)", "description": "Common mistakes and real solutions", "why_unique": "Contrarian take with solutions"},
            {"angle": f"{topic} vs manual: real cost comparison", "description": "Side-by-side cost/time analysis", "why_unique": "Buyers need this to justify budget"},
        ],
        "business_applications": [
            f"Use {topic} to automate client reporting",
            f"Build a {topic}-powered lead qualification system",
            f"Integrate {topic} into your delivery workflow to 3x output",
        ],
        "common_mistakes": [
            "Starting too complex — begin with one repeatable task",
            "Not measuring baseline before implementing",
            "Trying to automate everything at once instead of highest-ROI tasks first",
        ],
        "roadmap": [
            f"Week 1: Identify your highest-ROI task to automate with {topic}",
            "Week 2: Build and test a basic workflow",
            "Week 3: Measure results, document the system",
            "Week 4: Scale to the next task or share the system with your team",
        ],
        "metrics": ["Hours saved per week", "Cost per output unit", "Error rate reduction", "Client NPS change"],
        "full_research": f"Research data for {topic} — connect a Gemini API key to unlock deep AI-powered research.",
    }

async def research_topic(topic: str) -> dict:
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return get_fallback_research(topic)

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')

        prompt = f"""You are a business-focused AI researcher. Research this topic for a solopreneur/agency owner audience: "{topic}"

Return ONLY valid JSON with this exact structure:
{{
  "hook_options": ["hook1", "hook2", "hook3"],
  "unique_angles": [
    {{"angle": "angle title", "description": "brief desc", "why_unique": "why this stands out"}},
    {{"angle": "angle title", "description": "brief desc", "why_unique": "why this stands out"}},
    {{"angle": "angle title", "description": "brief desc", "why_unique": "why this stands out"}}
  ],
  "business_applications": ["app1", "app2", "app3"],
  "common_mistakes": ["mistake1", "mistake2", "mistake3"],
  "roadmap": ["step1", "step2", "step3", "step4"],
  "metrics": ["metric1", "metric2", "metric3", "metric4"],
  "full_research": "2-3 paragraph deep dive"
}}

Focus on: specific numbers, ROI, real-world applications. Voice: direct, no-BS, business owner speaking to peers."""

        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith('```'):
            text = text.split('```')[1]
            if text.startswith('json'): text = text[4:]
        data = json.loads(text)
        data['topic'] = topic
        data['timestamp'] = datetime.now(timezone.utc).isoformat()
        return data
    except Exception as e:
        print(f"Gemini research error: {e}")
        return get_fallback_research(topic)

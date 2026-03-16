from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

from news_scraper.aggregator import get_aggregated_news, get_trending_topics
from research_engine.deep_research import research_topic
from carousel_generator.generator import generate_carousel

app = FastAPI(title="AI News Hub API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResearchRequest(BaseModel):
    topic: str

class CarouselRequest(BaseModel):
    topic: str
    style: Optional[str] = 'tech_breakdown'
    custom_angle: Optional[str] = None

@app.get("/api/health")
async def health():
    return {"status": "ok", "gemini_configured": bool(os.getenv("GEMINI_API_KEY"))}

@app.get("/api/news")
async def news(limit: int = Query(20, ge=1, le=50), offset: int = Query(0, ge=0), topic: Optional[str] = None):
    return await get_aggregated_news(limit=limit, offset=offset, topic=topic)

@app.get("/api/trending")
async def trending():
    topics = await get_trending_topics()
    return {"topics": topics}

@app.post("/api/research")
async def research(req: ResearchRequest):
    return await research_topic(req.topic)

@app.post("/api/carousel/generate")
async def carousel(req: CarouselRequest):
    return await generate_carousel(req.topic, req.style or 'tech_breakdown', req.custom_angle)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

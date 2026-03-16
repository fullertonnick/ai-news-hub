import asyncio
import httpx
import feedparser
import time
import re
from datetime import datetime, timezone
from typing import List, Dict, Any

CACHE: Dict[str, Any] = {}
CACHE_TTL = 300  # 5 minutes

AI_KEYWORDS = ['ai', 'llm', 'gpt', 'claude', 'gemini', 'openai', 'anthropic', 'machine learning', 'deep learning',
                'neural', 'automation', 'agent', 'chatbot', 'artificial intelligence', 'ml ', 'nlp', 'transformer',
                'diffusion', 'midjourney', 'stable diffusion', 'copilot', 'cursor', 'mistral', 'llama', 'groq']

FALLBACK_ITEMS = [
    {"id": "f1", "title": "Claude 3.5 Sonnet Rewrites the Benchmarks — What It Means for AI Builders", "url": "https://anthropic.com", "source": "HackerNews", "score": 847, "comments": 234, "published_at": datetime.now(timezone.utc).isoformat(), "summary": "Anthropic's latest model sets new records across reasoning, coding, and vision tasks.", "topics": ["Claude", "Anthropic", "LLM"], "trending_score": 95},
    {"id": "f2", "title": "OpenAI Releases o3-mini: The Most Efficient Reasoning Model Yet", "url": "https://openai.com", "source": "Reddit", "score": 623, "comments": 189, "published_at": datetime.now(timezone.utc).isoformat(), "summary": "The new model delivers o1-level reasoning at a fraction of the cost.", "topics": ["OpenAI", "reasoning", "efficiency"], "trending_score": 88},
    {"id": "f3", "title": "How I Built a $10k/month AI Agency Using Nothing But Claude Code", "url": "#", "source": "DEV.to", "score": 412, "comments": 87, "published_at": datetime.now(timezone.utc).isoformat(), "summary": "Step-by-step breakdown of systems, pricing, and client acquisition.", "topics": ["agency", "Claude Code", "business"], "trending_score": 82},
    {"id": "f4", "title": "Google Gemini 1.5 Pro Now Free for Developers — Here's What Changed", "url": "https://ai.google.dev", "source": "ProductHunt", "score": 398, "comments": 156, "published_at": datetime.now(timezone.utc).isoformat(), "summary": "Google opens up its most powerful model with a 1M token context window.", "topics": ["Gemini", "Google", "free tier"], "trending_score": 79},
    {"id": "f5", "title": "Cursor AI vs GitHub Copilot: Real-World Developer Test After 90 Days", "url": "#", "source": "DEV.to", "score": 356, "comments": 98, "published_at": datetime.now(timezone.utc).isoformat(), "summary": "I tracked every AI suggestion, acceptance rate, and time saved across 3 production projects.", "topics": ["Cursor", "Copilot", "productivity"], "trending_score": 76},
    {"id": "f6", "title": "The MCP Protocol Is Changing How AI Agents Work — A Deep Dive", "url": "#", "source": "HackerNews", "score": 287, "comments": 67, "published_at": datetime.now(timezone.utc).isoformat(), "summary": "Model Context Protocol standardizes how LLMs connect to tools and data sources.", "topics": ["MCP", "agents", "Claude"], "trending_score": 71},
    {"id": "f7", "title": "Mistral Large 2 Benchmarks: Beating GPT-4o at Half the Price", "url": "#", "source": "Reddit", "score": 245, "comments": 78, "published_at": datetime.now(timezone.utc).isoformat(), "summary": "European AI lab continues to close the gap with US frontier models.", "topics": ["Mistral", "benchmarks", "cost"], "trending_score": 68},
    {"id": "f8", "title": "AI Automation Is Killing These 5 Agency Services (And Creating 3 New Ones)", "url": "#", "source": "ProductHunt", "score": 198, "comments": 45, "published_at": datetime.now(timezone.utc).isoformat(), "summary": "The AI wave isn't just changing how we work — it's eliminating entire service categories.", "topics": ["automation", "agency", "future of work"], "trending_score": 62},
]

def is_ai_related(text: str) -> bool:
    text_lower = text.lower()
    return any(kw in text_lower for kw in AI_KEYWORDS)

def extract_topics(text: str) -> List[str]:
    topics = []
    text_lower = text.lower()
    topic_map = {
        'claude': 'Claude', 'anthropic': 'Anthropic', 'openai': 'OpenAI', 'gpt': 'GPT',
        'gemini': 'Gemini', 'llama': 'Llama', 'mistral': 'Mistral', 'groq': 'Groq',
        'cursor': 'Cursor', 'copilot': 'Copilot', 'agent': 'AI Agents', 'mcp': 'MCP',
        'automation': 'Automation', 'llm': 'LLM', 'machine learning': 'ML', 'deep learning': 'Deep Learning',
        'diffusion': 'Image Generation', 'midjourney': 'Midjourney', 'coding': 'Coding',
        'reasoning': 'Reasoning', 'benchmark': 'Benchmarks',
    }
    for kw, label in topic_map.items():
        if kw in text_lower and label not in topics:
            topics.append(label)
    return topics[:5]

def calculate_trending_score(score: int, comments: int, hours_old: float) -> int:
    raw = (score * 1.0 + comments * 2.0) / max(1, (hours_old + 2) ** 1.2)
    return min(99, max(10, int(raw * 3)))

async def fetch_hackernews(client: httpx.AsyncClient) -> List[Dict]:
    try:
        r = await client.get('https://hn.algolia.com/api/v1/search?query=AI+LLM+machine+learning&tags=story&hitsPerPage=30&numericFilters=created_at_i>1700000000', timeout=10)
        hits = r.json().get('hits', [])
        items = []
        for h in hits:
            title = h.get('title', '')
            if not is_ai_related(title): continue
            ts = h.get('created_at', '')
            try:
                dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                hours = (datetime.now(timezone.utc) - dt).total_seconds() / 3600
            except: hours = 24
            score = h.get('points', 0) or 0
            comments = h.get('num_comments', 0) or 0
            items.append({
                'id': f"hn_{h.get('objectID','')}",
                'title': title,
                'url': h.get('url') or f"https://news.ycombinator.com/item?id={h.get('objectID','')}",
                'source': 'HackerNews',
                'score': score,
                'comments': comments,
                'published_at': ts,
                'summary': '',
                'topics': extract_topics(title),
                'trending_score': calculate_trending_score(score, comments, hours),
            })
        return items
    except Exception as e:
        print(f"HN error: {e}")
        return []

async def fetch_reddit(client: httpx.AsyncClient, sub: str) -> List[Dict]:
    try:
        headers = {'User-Agent': 'AI-News-Hub/1.0'}
        r = await client.get(f'https://www.reddit.com/r/{sub}/hot.json?limit=25', headers=headers, timeout=10)
        posts = r.json().get('data', {}).get('children', [])
        items = []
        for p in posts:
            d = p.get('data', {})
            title = d.get('title', '')
            if not is_ai_related(title): continue
            created = d.get('created_utc', 0)
            try:
                dt = datetime.fromtimestamp(created, tz=timezone.utc)
                hours = (datetime.now(timezone.utc) - dt).total_seconds() / 3600
                ts = dt.isoformat()
            except: hours = 24; ts = datetime.now(timezone.utc).isoformat()
            score = d.get('score', 0) or 0
            comments = d.get('num_comments', 0) or 0
            items.append({
                'id': f"reddit_{d.get('id','')}",
                'title': title,
                'url': f"https://reddit.com{d.get('permalink','')}",
                'source': 'Reddit',
                'score': score,
                'comments': comments,
                'published_at': ts,
                'summary': d.get('selftext', '')[:200] if d.get('selftext') else '',
                'topics': extract_topics(title),
                'trending_score': calculate_trending_score(score, comments, hours),
            })
        return items
    except Exception as e:
        print(f"Reddit/{sub} error: {e}")
        return []

async def fetch_devto(client: httpx.AsyncClient) -> List[Dict]:
    try:
        r = await client.get('https://dev.to/api/articles?tag=ai&per_page=20&top=7', timeout=10)
        articles = r.json()
        items = []
        for a in articles:
            title = a.get('title', '')
            ts = a.get('published_at', datetime.now(timezone.utc).isoformat())
            try:
                dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                hours = (datetime.now(timezone.utc) - dt).total_seconds() / 3600
            except: hours = 48
            reactions = a.get('positive_reactions_count', 0) or 0
            comments = a.get('comments_count', 0) or 0
            items.append({
                'id': f"devto_{a.get('id','')}",
                'title': title,
                'url': a.get('url', ''),
                'source': 'DEV.to',
                'score': reactions,
                'comments': comments,
                'published_at': ts,
                'summary': a.get('description', ''),
                'topics': extract_topics(title + ' ' + (a.get('description') or '')),
                'trending_score': calculate_trending_score(reactions, comments, hours),
            })
        return items
    except Exception as e:
        print(f"DEV.to error: {e}")
        return []

async def fetch_producthunt(client: httpx.AsyncClient) -> List[Dict]:
    try:
        feed = feedparser.parse('https://www.producthunt.com/feed')
        items = []
        for entry in feed.entries[:20]:
            title = entry.get('title', '')
            if not is_ai_related(title): continue
            ts = entry.get('published', datetime.now(timezone.utc).isoformat())
            items.append({
                'id': f"ph_{hash(title) & 0xFFFFFF}",
                'title': title,
                'url': entry.get('link', ''),
                'source': 'ProductHunt',
                'score': 50,
                'comments': 0,
                'published_at': ts,
                'summary': re.sub('<[^<]+?>', '', entry.get('summary', ''))[:200],
                'topics': extract_topics(title),
                'trending_score': 55,
            })
        return items
    except Exception as e:
        print(f"ProductHunt error: {e}")
        return []

async def get_aggregated_news(limit: int = 20, offset: int = 0, topic: str = None) -> Dict:
    cache_key = f"news_{topic or 'all'}"
    now = time.time()
    if cache_key in CACHE and now - CACHE[cache_key]['ts'] < CACHE_TTL:
        all_items = CACHE[cache_key]['items']
    else:
        async with httpx.AsyncClient() as client:
            results = await asyncio.gather(
                fetch_hackernews(client),
                fetch_reddit(client, 'artificial'),
                fetch_reddit(client, 'MachineLearning'),
                fetch_reddit(client, 'ClaudeAI'),
                fetch_devto(client),
                fetch_producthunt(client),
                return_exceptions=True
            )
        all_items = []
        seen_titles = set()
        for r in results:
            if isinstance(r, list):
                for item in r:
                    title_key = item['title'].lower()[:50]
                    if title_key not in seen_titles:
                        seen_titles.add(title_key)
                        all_items.append(item)
        all_items.sort(key=lambda x: x['trending_score'], reverse=True)
        if not all_items:
            all_items = list(FALLBACK_ITEMS)
        CACHE[cache_key] = {'ts': now, 'items': all_items}

    if topic:
        all_items = [i for i in all_items if topic.lower() in ' '.join(i['topics']).lower() or topic.lower() in i['title'].lower()]

    total = len(all_items)
    page_items = all_items[offset:offset + limit]
    return {'items': page_items, 'total': total, 'has_more': offset + limit < total}

async def get_trending_topics() -> List[Dict]:
    cache_key = "news_all"
    now = time.time()
    if cache_key in CACHE and now - CACHE[cache_key]['ts'] < CACHE_TTL:
        all_items = CACHE[cache_key]['items']
    else:
        result = await get_aggregated_news(limit=100)
        all_items = result['items']

    topic_counts: Dict[str, int] = {}
    topic_scores: Dict[str, float] = {}
    for item in all_items:
        for t in item['topics']:
            topic_counts[t] = topic_counts.get(t, 0) + 1
            topic_scores[t] = topic_scores.get(t, 0) + item['trending_score']

    topics = []
    for t, count in sorted(topic_counts.items(), key=lambda x: topic_scores.get(x[0], 0), reverse=True)[:15]:
        avg_score = topic_scores[t] / count
        topics.append({'topic': t, 'count': count, 'hot': avg_score > 70})
    return topics

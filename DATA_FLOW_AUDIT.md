# DATA FLOW AUDIT — Carousel Dynamic Content Investigation
Generated: 2026-03-24

---

## 1. Where does the scraper output its data?

### Source A — News Scraper (`/pages/api/news.ts`)
Produces an array of `NewsItem` objects. Shape:
```
{
  id, title, source, url, summary, published_at,
  trending_score, topics, comments, score, creator
}
```
**CRITICAL FINDING**: The news scraper does NOT fetch or store article body text.
Only `title` and `summary` (typically 1–2 sentences) are available.
There is no `body`, `content`, or `full_text` field.

### Source B — Research API (`/pages/api/research.ts`)
Called from `CarouselGenerator.tsx` Step 1. Takes a topic STRING. Outputs `ResearchData`:
```
{
  topic, timestamp,
  hook_options: string[],
  unique_angles: { angle, description, why_unique }[],
  business_applications: string[],
  common_mistakes: string[],
  roadmap: string[],
  metrics: string[],
  full_research: string   // ← 3-4 paragraphs of topic analysis (Gemini) or generic fallback
}
```
When Gemini key present: dynamically researched per topic ✓
When no Gemini key: generic fallback with topic string injected into templates (partially dynamic)

### Source C — Carousel Generate API (`/pages/api/carousel/generate.ts`)
Takes: `{ topic: string, style: string, custom_angle?: string }`
Returns: `CarouselData` with `slides[]`, `keyword`, `caption`, `quality_report`

---

## 2. Where does that data get passed into slide components?

```
CarouselGenerator.tsx
  │
  ├── Step 1: fetch('/api/research', { topic })
  │     └── stored as: const [research, setResearch] = useState<ResearchData|null>()
  │
  ├── Step 2: user picks angle + style
  │           angle stored as: const [angle, setAngle]
  │           style stored as: const [style, setStyle]
  │
  ├── Step 3: fetch('/api/carousel/generate', { topic, style, custom_angle: angle })
  │     └── ⚠️ RESEARCH DATA IS NEVER INCLUDED IN THIS REQUEST
  │     └── stored as: const [slides, setSlides] = useState<CarouselSlide[]>()
  │
  └── <SlideRenderer slide={slides[i]} slideNumber={i+1} totalSlides={n} />
        └── reads: slide.text, slide.accent_word, slide.section_label, slide.visual
```

**THE BUG**: `research` state (containing `full_research`, `metrics`, `business_applications`,
`roadmap`) is populated in Step 1 and displayed in Step 2 (angle picker UI) but is
**NEVER forwarded to `/api/carousel/generate`**. The carousel generator only receives
the raw topic string.

---

## 3. Dynamic vs Hardcoded — Verdict Per Slide Element

### With NO Gemini API key (current production state on Vercel):

| Slide Element | Status | Source | Notes |
|---|---|---|---|
| Cover headline text | ❌ HARDCODED | `buildFallback()` | `"${topic.slice(0,30)}: what it actually means for your business"` — same template every time |
| Cover background image | ⚠️ STATIC | `/public/nick.jpg` | Same photo every carousel. Not a bug per se but looks identical. |
| Slide 2 diagram — input label | ❌ HARDCODED | `buildFallback()` | Always "Your Daily Tasks" |
| Slide 2 diagram — process label | ⚠️ PARTIAL | `buildFallback()` | `topic.slice(0, 18)` — only label that changes |
| Slide 2 diagram — output label | ❌ HARDCODED | `buildFallback()` | Always "Done. Automated." |
| Slide 3 stat: value 1 | ❌ HARDCODED | `buildFallback()` | Always "15 hrs" |
| Slide 3 stat: value 2 | ❌ HARDCODED | `buildFallback()` | Always "3.2x" |
| Slide 3 stat: value 3 | ❌ HARDCODED | `buildFallback()` | Always "67%" |
| Slide 3 stat: value 4 | ❌ HARDCODED | `buildFallback()` | Always "2 wks" |
| Slide 4 step 1 title | ❌ HARDCODED | `buildFallback()` | Always "Find your biggest time drain" |
| Slide 4 step 2 title | ❌ HARDCODED | `buildFallback()` | Always "Test one AI tool on just that task" |
| Slide 4 step 3 title | ❌ HARDCODED | `buildFallback()` | Always "Measure honestly after 7 days" |
| CTA headline | ⚠️ PARTIAL | `buildFallback()` | `"Want my full ${slug} implementation guide?"` — formula fixed, slug varies |
| CTA keyword | ⚠️ PARTIAL | `buildFallback()` | `topic.split(/\s+/)[0].toUpperCase()` — always just first word of topic |

### With Gemini API key:

| Slide Element | Status | Notes |
|---|---|---|
| All content | ✅ DYNAMIC | Gemini generates per topic from scratch |
| Stats | ✅ DYNAMIC | Gemini picks appropriate numbers per topic |
| Steps | ✅ DYNAMIC | Topic-specific action steps |
| Cover headline | ✅ DYNAMIC | But quality gate may rewrite if too long |
| Keywords | ✅ DYNAMIC | Gemini picks appropriate 1-2 word keyword |

**BUT EVEN WITH GEMINI**: The generate endpoint still doesn't receive:
- The article's `summary` from the news feed
- The `ResearchData` object (full_research, metrics, business_applications)
- The selected `custom_angle` description (only the angle title string is sent, not its description)

---

## 4. Root Causes (Ranked by Impact)

### RC-1 (Critical): Research data is generated but never used in carousel generation
`CarouselGenerator.tsx` calls both `/api/research` and `/api/carousel/generate`
but doesn't forward the research output to the carousel endpoint.
The `full_research` field contains a 3-4 paragraph AI summary perfect for
extracting stats, steps, and dynamic content — and it's being thrown away.

### RC-2 (Critical): `buildFallback()` has static stats for every topic
`buildFallback()` in `generate.ts` returns identical `stats_grid` values
(`15 hrs`, `3.2x`, `67%`, `2 wks`) for all `tech_breakdown` carousels.
This is what the user sees when no Gemini key is set.

### RC-3 (Major): No article body text is ever scraped
The news scraper doesn't fetch article body text — only `title` and `summary`.
A `FIX A` style "extraction layer reading article body" cannot work as described
because there is no body text to extract from. The fix must work with:
- The topic string
- The news item `summary` (1-2 sentences)
- The `ResearchData.full_research` paragraph (available after Step 1)

### RC-4 (Moderate): `buildFallback()` diagram labels are nearly static
Only `topic.slice(0,18)` changes. Input/output labels are always the same.

### RC-5 (Minor): Cover background doesn't change between carousels
Nick's photo is the same on every cover slide. No state bug — it's just
the same `src="/nick.jpg"` every time. This is expected behavior from the
current implementation but makes all covers look identical.

---

## Proposed Fix Architecture (pending confirmation)

### Fix A — Pass research data to carousel generator
Update `doGenerate()` in `CarouselGenerator.tsx` to include research context:
```typescript
body: JSON.stringify({
  topic,
  style,
  custom_angle: angle,
  research_context: research   // ← add this
})
```
Update `generate.ts` to accept and use `research_context` when present.

### Fix B — Make fallback topic-specific using deterministic seeding
Since there's no Gemini key on the deployed version, `buildFallback()` needs
to generate unique-but-consistent content from the topic string using:
- Topic word hashing for stat values (not truly random — consistent per topic)
- Topic category detection for choosing stat types
- Research context (if forwarded) for steps and diagram labels

### Fix C — Layout selector based on category
Detect topic category (claude-code, make-automation, ai-agents, business-ai)
and vary the visual layout per slide accordingly.

### Fix D — Cover gradient (Option A chosen)
Generate a deterministic radial gradient from the topic slug hash.
This is faster to implement than adding 5-6 cover images.
The photo stays as the background but the gradient overlay color shifts per topic.

### Fix E — Stats extraction from research context
Use `research.metrics[]` and `research.business_applications[]` as the
source of truth for stats when no Gemini key. These are topic-specific.

---

## Files to Change (post-confirmation)

1. `frontend/app/components/CarouselGenerator.tsx` — pass research to generate call
2. `frontend/pages/api/carousel/generate.ts` — accept + use research_context, fix buildFallback
3. `frontend/app/components/SlideRenderer.tsx` — cover gradient seeded per topic (Fix D)

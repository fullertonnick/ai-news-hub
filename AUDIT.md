# Codebase Audit — AI News Hub Carousel Generator

## Current Architecture

```
/ai-news-hub/
├── frontend/                        ← Next.js 14 app (deployed on Vercel)
│   ├── app/
│   │   ├── page.tsx                 ← Main news feed page
│   │   ├── layout.tsx               ← Root layout (Inter + JetBrains Mono fonts)
│   │   ├── globals.css              ← Base styles + skeleton animation
│   │   ├── types.ts                 ← TypeScript interfaces
│   │   └── components/
│   │       ├── SlideRenderer.tsx    ← ★ RENDERS carousel slides (React → PNG via html-to-image)
│   │       ├── CarouselGenerator.tsx← ★ Modal: Research → Configure → Preview/Download workflow
│   │       ├── NewsCard.tsx         ← Feed card UI with source badges
│   │       └── TrendingSidebar.tsx  ← Trending topics + custom topic input
│   ├── pages/api/
│   │   ├── news.ts                  ← ★ Aggregates HN + Reddit + DEV.to + YouTube + X
│   │   ├── trending.ts              ← Derives trending topics from HN
│   │   ├── research.ts              ← AI research via Gemini 1.5 Flash (or fallback)
│   │   └── carousel/generate.ts    ← ★ Generates slide copy/layout via Gemini (or fallback)
│   ├── public/nick.jpg              ← Profile photo used in slide header
│   └── tailwind.config.js           ← brand-orange: #FF6B35, brand-dark: #0A0A0A
│
└── backend/                         ← Python/FastAPI (NOT deployed — unused)
    ├── main.py
    ├── news_scraper/aggregator.py
    ├── research_engine/deep_research.py
    └── carousel_generator/generator.py
```

---

## Every File and What It Does

| File | Purpose |
|------|---------|
| `frontend/app/page.tsx` | Main feed UI — 2-column layout, search, filter, load more |
| `frontend/app/layout.tsx` | HTML shell — Inter + JetBrains Mono, dark background |
| `frontend/app/globals.css` | Scrollbar styles, skeleton shimmer animation |
| `frontend/app/types.ts` | TypeScript: NewsItem, CarouselSlide, SlideVisual types |
| `frontend/app/components/SlideRenderer.tsx` | Renders one slide as a 540×675px (display) or 1080×1350px (export) React div. All styles inline. Uses scale factor for export. Implements: regex syntax highlighter, SVG diagrams, stats grid, steps list. Profile photo from /nick.jpg |
| `frontend/app/components/CarouselGenerator.tsx` | 3-step modal: (1) AI Research, (2) Choose angle + style, (3) Preview with left/right navigation + download. Uses html-to-image to export full-res PNGs |
| `frontend/app/components/NewsCard.tsx` | Card for one news item — source badge, creator badge, trending score bar, topic tags, "Generate Carousel" button |
| `frontend/app/components/TrendingSidebar.tsx` | Ranked topic list + custom topic input + Nick's brand card |
| `frontend/pages/api/news.ts` | Fetches: HackerNews Algolia, Reddit (r/artificial, r/MachineLearning, r/ClaudeAI), DEV.to, YouTube via Piped API, X/Twitter via nitter RSS. 5-min cache. Interleaves creator content 1:4 ratio |
| `frontend/pages/api/trending.ts` | Fetches HN, counts topic frequency, returns top 15 trending topics |
| `frontend/pages/api/research.ts` | Calls Gemini 1.5 Flash to research topic → returns hooks, unique_angles, business_applications, roadmap, metrics. Falls back to hardcoded quality content if no API key |
| `frontend/pages/api/carousel/generate.ts` | Calls Gemini 1.5 Flash to generate 5-slide carousel JSON (text + visual layout data). Falls back to high-quality hardcoded slides. Supports 3 styles: tech_breakdown, use_case_list, prompt_reveal |
| `frontend/tailwind.config.js` | brand-orange (#FF6B35), brand-dark (#0A0A0A) |
| `frontend/public/nick.jpg` | Nick's headshot used in slide avatar |
| `backend/*` | Python FastAPI backend — NOT deployed, duplicates API route logic. Safe to ignore. |

---

## ⚠️ CRITICAL FINDING: Imagen 3 Does NOT Exist in This Codebase

The instructions reference "Imagen 3 (Nano Banana 2)" as if it's already integrated.

**It is not.** This codebase has zero image generation calls. Here is how slide images currently work:

1. Gemini generates **text + layout data** (JSON with slide copy, visual type, and data)
2. `SlideRenderer.tsx` renders that JSON as **React components** (HTML + inline CSS)
3. `html-to-image` library captures the rendered DOM as a **PNG** for download
4. There is no AI-generated background imagery — slides use CSS gradients/colors only

**Implication**: Phases 5 (Imagen 3 prompts) and the image output in Phase 6 require adding Imagen 3 from scratch, not upgrading existing code. This needs a decision: **do you want Imagen 3 backgrounds, or keep the current React-rendered approach?** Both are valid. Imagen 3 would require a Google Cloud API key with Vertex AI access.

---

## Current Weaknesses

1. **Brand colors don't match SimpliScale spec** — current: `#FF6B35`; spec: `#FF7107` tangerine
2. **Font is Inter, not Plus Jakarta Sans** — spec calls for Plus Jakarta Sans
3. **No accent word system** — no single word highlighted orange in headlines
4. **No footer CTA** — slides show mute icon in bottom-right, but no "🔖 save for later"
5. **No output package** — no CAROUSEL_BRIEF.md, no slide JSON files, no folder structure per carousel
6. **No quality gate** — no forbidden word check, no copy length validation
7. **Caption generation missing** — app generates slides but no Instagram caption
8. **5 hardcoded slide styles only** — no COVER_PHOTO, PROMPT_CODE, SKILL_CARD, STEP_SLIDE, CTA_SLIDE templates
9. **Research angles too vague** — improved recently but still generic without Gemini key
10. **No "save for later" CTA slide** — last slide is a follow CTA but not in SimpliScale format

---

## What I Plan to Change

### ✅ Will change (additive, no existing functionality broken):
- [ ] `tailwind.config.js` — add SimpliScale brand colors as aliases (keep existing colors)
- [ ] `app/globals.css` — add Plus Jakarta Sans Google Font import
- [ ] `app/types.ts` — extend SlideVisual types to support new template types
- [ ] **NEW** `frontend/src/brand/simpliscale.ts` — full brand system constants
- [ ] `app/components/SlideRenderer.tsx` — update colors, font, add accent word support, update footer to include "🔖 save for later", add new slide templates
- [ ] `pages/api/carousel/generate.ts` — upgrade prompts to use SimpliScale voice rules, accent word, cover formulas, CTA format, add quality gate logic, add caption generation
- [ ] `pages/api/research.ts` — tighten angle descriptions further
- [ ] **NEW** `pages/api/carousel/brief.ts` — generate CAROUSEL_BRIEF.md format output
- [ ] **NEW** output package generation (slide JSONs + brief + caption in structured format)

### ❌ Will NOT touch:
- `pages/api/news.ts` — news scraping pipeline (just updated, working)
- `pages/api/trending.ts` — trending topics
- `app/components/NewsCard.tsx` — feed cards (just updated)
- `app/components/TrendingSidebar.tsx` — sidebar
- `app/page.tsx` — main feed layout
- `app/layout.tsx` — root layout
- `frontend/public/nick.jpg` — profile photo
- `backend/*` — Python backend (unused)
- Vercel deployment config (`.vercel/project.json`)
- `next.config.js`, `postcss.config.js`, `tsconfig.json`

---

## Questions Before Proceeding

1. **Imagen 3**: The current app doesn't use it at all. Do you want to ADD Imagen 3 for AI-generated backgrounds? This requires a Google Cloud / Vertex AI API key. If yes, slides would get real AI-generated dark cinematic backgrounds instead of CSS gradients. If no, I'll apply the SimpliScale design system to the existing React-rendered slides (which still look great — just CSS/code, not AI images).

2. **Output package structure**: The spec describes saving files to `/carousel-output/[topic-slug]/` with CAROUSEL_BRIEF.md, slide JSONs, images, and captions. Currently everything happens in the browser. Do you want this saved to disk (requires a backend), or returned as downloadable files from the browser?

3. **Nick's photo directions**: The COVER_PHOTO template needs actual photos of Nick in specific poses. Should I use the existing `/public/nick.jpg` for now as placeholder, and add a placeholder label system for the designer?

---

## No Risks — These I'll Confirm With You First

- Any change that touches the carousel download/export flow
- Any API key requirement (Imagen 3, Vertex AI)
- Any change to the Vercel deployment configuration

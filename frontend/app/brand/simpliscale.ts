// SimpliScale Brand System — Single source of truth for all carousel styling
// Used by SlideRenderer and carousel generation APIs

export const Brand = {
  colors: {
    bg_primary: '#111111',           // Near-black — carousel backgrounds
    bg_surface: '#282828',           // Cards, code blocks, containers
    bg_overlay: 'rgba(0,0,0,0.55)', // Photo overlays on cover slides
    accent_primary: '#FF7107',       // Tangerine — the brand orange
    accent_secondary: '#FFC26B',     // Sunrise yellow — gradient end, subtle highlights
    text_primary: '#F9F9FB',         // Dim white — headlines and body
    text_muted: '#C4C4C4',           // Cool gray — secondary text, footer
    divider: 'rgba(255,255,255,0.08)',
    code_border: 'rgba(255,255,255,0.07)',
    star: '#FF7107',
  },

  typography: {
    font_family: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    mono_font: '"JetBrains Mono", "Courier New", monospace',
    weights: {
      heading: 800,    // ExtraBold — all H1 slide headlines
      subheading: 700, // Bold — section labels, sub-titles
      body: 400,       // Regular — description text
      label: 500,      // Medium — eyebrows, tags, footer text
      semibold: 600,
    },
  },

  canvas: {
    width: 1080,
    height: 1350,
    format: '4:5 portrait',
    safe_zone_padding: 60,  // px from edges
    footer_height: 80,      // reserved bottom area
  },

  brand: {
    handle: '@thenickcornelius',
    brand_name: 'SimpliScale',
    save_cta: '🔖 save for later',
  },

  // Slide templates — used as visual.type in CarouselSlide
  templates: {
    COVER_PHOTO: 'cover_photo',
    PROMPT_CODE: 'code_block',
    SKILL_CARD: 'skill_card',
    STEP: 'steps_list',
    CTA: 'cta_slide',
    STATS: 'stats_grid',
    DIAGRAM: 'diagram',
    TEXT_ONLY: 'none',
  },

  // Quality gate: forbidden words → replacements
  forbidden_words: {
    'leverage': 'use',
    'utilize': 'use',
    'synergy': 'teamwork',
    'game-changer': 'breakthrough',
    'revolutionary': 'new',
    'paradigm': 'approach',
    'disruptive': 'new',
    'cutting-edge': 'modern',
    'innovative': 'effective',
  },

  // Hashtag tiers for Instagram captions
  hashtags: {
    tier1_core: ['#claudecode', '#claudeai', '#aiautomation', '#aiforbusiness', '#aiagents', '#automation', '#anthropic', '#n8n'],
    tier2_broad: ['#artificialintelligence', '#aitools', '#machinelearning', '#futureofwork', '#productivity', '#techtools'],
    tier3_business: ['#businessowner', '#entrepreneurship', '#businessgrowth', '#scaleyourbusiness', '#simpliscale', '#thenickcornelius'],
    tier4_topical: ['#chatgpt', '#openai', '#llm', '#makecreator', '#nocode', '#solopreneur', '#agencyowner'],
  },
} as const;

export type BrandColors = typeof Brand.colors;
export type BrandTypography = typeof Brand.typography;

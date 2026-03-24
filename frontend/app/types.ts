export interface NewsItem {
  id: string; title: string; source: string; url: string; summary: string;
  published_at: string; trending_score: number; topics: string[]; comments: number;
  score: number; creator?: string | null;
}

export interface TrendingTopic { topic: string; count: number; hot: boolean; }

// ─── Slide Visual Types ───────────────────────────────────────────────────────

export interface CodeBlockVisual {
  type: 'code_block';
  language: string;
  code: string;
  highlights?: string[];     // words to highlight orange in code
  instruction?: string;      // e.g. "Send Claude this message"
}

export interface StatsGridVisual {
  type: 'stats_grid';
  stats: { label: string; value: string; icon: string }[];
}

export interface DiagramVisual {
  type: 'diagram';
  title: string;
  nodes: { id: string; label: string; type: 'input' | 'process' | 'output' }[];
  edges: { from: string; to: string }[];
}

export interface StepsListVisual {
  type: 'steps_list';
  steps: { number: string | number; title: string; desc: string }[];
}

export interface CoverPhotoVisual {
  type: 'cover_photo';
  photo_direction?: string;     // pose/vibe for Nick's photo
  floating_elements?: string[]; // emoji icons to scatter around cover
  subtext?: string;             // optional 10-word max supporting line
  gradient_hue?: number;        // 0-360 hue for cover gradient overlay (deterministic per topic)
}

export interface SkillCardVisual {
  type: 'skill_card';
  name: string;
  source: string;        // platform/origin
  category: string;      // category pill text
  stars: string;         // "5" or rating display
  icon?: string;         // emoji
  description?: string;  // "Use when X. Does Y. Business application: Z."
}

export interface CTASlideVisual {
  type: 'cta_slide';
  keyword: string;               // ALL CAPS, 1-2 words
  subtext?: string;
  layout_variant?: 'photo' | 'text';  // photo = Nick on right half; text = centered (default)
}

export interface BigQuoteVisual {
  type: 'big_quote';
  supporting?: string;  // small text below the quote
}

export interface ComparisonVisual {
  type: 'comparison';
  before_label?: string;  // default "❌ Without AI"
  after_label?: string;   // default "✅ With AI"
  before_items: string[];
  after_items: string[];
}

export interface ChecklistVisual {
  type: 'checklist';
  items: { text: string }[];
}

export interface NoneVisual { type: 'none'; }

export type SlideVisual =
  | CodeBlockVisual
  | StatsGridVisual
  | DiagramVisual
  | StepsListVisual
  | CoverPhotoVisual
  | SkillCardVisual
  | CTASlideVisual
  | BigQuoteVisual
  | ComparisonVisual
  | ChecklistVisual
  | NoneVisual;

// ─── Carousel Slide ───────────────────────────────────────────────────────────

export interface CarouselSlide {
  slide_number?: number;
  type?: 'hook' | 'context' | 'proof' | 'how_it_works' | 'results' | 'cta' | 'cover' | 'content' | 'step' | 'skill';
  text: string;
  accent_word?: string;    // single word to render in #FF7107 orange
  section_label?: string;  // e.g. "Step 1" or "— Skill 2 —"
  visual: SlideVisual;
}

// ─── Quality Gate ─────────────────────────────────────────────────────────────

export interface QualityReport {
  passed: boolean;
  issues: string[];
  warnings: string[];
}

// ─── Full Carousel Output ─────────────────────────────────────────────────────

export interface CarouselData {
  topic: string;
  style: string;
  slides: CarouselSlide[];
  keyword: string;
  caption: string;
  carousel_brief: CarouselBrief;
  quality_report: QualityReport;
  generated_at: string;
  // legacy fields
  slides_count?: number;
  hashtags?: string[];
}

export interface CarouselBrief {
  title: string;
  format: string;
  slides_count: number;
  keyword: string;
  photo_direction: string;
  slide_summaries: string[];
  post_time: string;
}

// ─── Research ─────────────────────────────────────────────────────────────────

export interface ResearchData {
  topic: string;
  timestamp: string;
  hook_options: string[];
  unique_angles: { angle: string; description: string; why_unique: string }[];
  business_applications: string[];
  common_mistakes: string[];
  roadmap: string[];
  metrics: string[];
  full_research: string;
}

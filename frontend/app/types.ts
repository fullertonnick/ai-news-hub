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
  photo_direction?: string;                        // pose/vibe for Nick's photo
  floating_elements?: string[];                    // emoji icons to scatter around cover
  subtext?: string;                                // optional 10-word max supporting line
  gradient_hue?: number;                           // 0-360 hue for cover gradient overlay (deterministic per topic)
  position?: 'top' | 'middle' | 'bottom';         // vertical position of headline block (default: 'bottom')
  photo_enabled?: boolean;                         // whether to show Nick's photo background (default: true)
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

// ─── Text Overlay (shared between store and renderer) ────────────────────────

export interface TextOverlay {
  id: string;
  text: string;
  x: number;          // % from left (center anchor)
  y: number;          // % from top (center anchor)
  fontSize: number;   // px at 1080-unit export scale
  fontWeight: number;
  color: string;
  maxWidth: number;   // % of slide width
  zIndex: number;
  fontFamily?: string;
  rotation?: number;  // degrees
  opacity?: number;   // 0–1, defaults to 1
}

// ─── Sticker Overlay ─────────────────────────────────────────────────────────

export interface StickerOverlay {
  id: string;
  src: string;
  label: string;
  x: number;
  y: number;
  width: number;
  rotation: number;
  opacity: number;
  zIndex: number;
}

// ─── Carousel Slide ───────────────────────────────────────────────────────────

export interface CarouselSlide {
  id?: string;
  slide_number?: number;
  type?: 'hook' | 'context' | 'proof' | 'how_it_works' | 'results' | 'cta' | 'cover' | 'content' | 'step' | 'skill';
  text: string;
  accent_word?: string;       // single word to render in #FF7107 orange
  section_label?: string;     // e.g. "Step 1" or "— Skill 2 —"
  visual: SlideVisual;
  backgroundImage?: string;   // base64 data URL from Imagen 3 generation
  stickers?: StickerOverlay[];
  textOverlays?: TextOverlay[];
  useTextOverlays?: boolean;  // when true, hide baked-in headline text
  textOffsetX?: number;       // px offset at 1080-scale for the text block
  textOffsetY?: number;
}


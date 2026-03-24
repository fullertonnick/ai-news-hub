export type TopicCategory = 'claude-code' | 'make-automation' | 'ai-agents' | 'business-ai' | 'general';

export interface SlideBackgroundPrompts {
  cover: string;
  slide2: string;
  slide3: string;
  slide4: string;
  cta: string;
  negative: string;
}

export const NEGATIVE_PROMPT =
  'text, typography, letters, numbers, watermarks, logos, UI elements, faces, people, blurry, low quality, pixelated, oversaturated, light backgrounds, white background, cartoonish, anime, illustration style, split screen, collage';

// ─── Cover Prompts ─────────────────────────────────────────────────────────────

const COVER_PROMPTS: Record<TopicCategory, string> = {
  'claude-code':
    'Dark cinematic home office at night, multiple ultrawide monitors casting warm amber code editor glow, deep shadows in corners, single orange desk lamp creating dramatic side lighting, near-black walls with subtle texture, light rays cutting through venetian blinds, wooden desk with laptop, bokeh depth of field, teal and orange color grade, anamorphic lens flare, RED camera look, ultra cinematic, no people, no text, 4K',

  'make-automation':
    'Dark cinematic modern workspace at night, dual monitors showing colorful workflow automation diagrams with orange nodes, sleek desk setup, deep shadows, warm orange practical lighting from below monitors, glass desk surface with subtle reflections, city lights visible through window in background, bokeh, professional atmosphere, anamorphic lens, no people, no text, 4K cinematic',

  'ai-agents':
    'Dark cinematic tech laboratory, floating holographic orange glowing sphere in center, dark room with subtle blue and orange ambient lighting, futuristic but grounded, deep shadows, dramatic lighting contrast, smooth dark surfaces, bokeh depth of field, ultra cinematic, no faces, no text, no UI, 4K',

  'business-ai':
    'Dark luxury executive office at night, floor-to-ceiling windows showing blurred city skyline, warm orange ambient lighting from architectural fixtures, premium dark wood and glass surfaces, single laptop on minimal desk, deep shadows, high contrast, cinematic color grade, no people, no text, 4K ultra detailed',

  'general':
    'Dark cinematic creative studio at night, warm orange accent lighting, deep shadows, professional atmosphere, minimal desk setup with glowing screen, bokeh depth of field, teal-orange color grade, anamorphic lens, no people, no text, 4K',
};

// ─── Position 2 Prompts (concept / hook slide) ────────────────────────────────

const SLIDE2_PROMPTS: Record<TopicCategory, string> = {
  'claude-code':
    'Extreme close-up dark keyboard with single key glowing orange, dark background, dramatic macro photography, shallow depth of field, orange bokeh lights in background, professional product photography, moody, ultra dark aesthetic, no text, no faces, 4K',

  'make-automation':
    'Dark abstract visualization of orange glowing connection nodes and workflow lines on near-black background, minimal, professional, depth of field, subtle glow, ready for text overlay, no text, no faces, 4K',

  'ai-agents':
    'Dark abstract neural pathway visualization, thin orange glowing threads connecting nodes across black space, deep and dimensional, minimal, no text, no faces, cinematic, 4K',

  'business-ai':
    'Dark minimal business aesthetic, single illuminated orange geometric shape on near-black background, professional, premium, depth and shadow, no text, no faces, 4K',

  'general':
    'Dark abstract orange light trails on near-black background, long exposure photography aesthetic, minimal, depth of field, professional, no text, 4K',
};

// ─── Position 3 Prompt (evidence / stats slide) ───────────────────────────────

const SLIDE3_PROMPT =
  'Ultra dark minimal background, deep charcoal gradient, very subtle warm orange radial glow emanating from center at low opacity, professional dark theme, completely clean and minimal, perfect for data visualization overlay, no objects, no patterns, seamless, no text, 4K';

// ─── Position 4 Prompt (action / steps slide) ────────────────────────────────

const SLIDE4_PROMPT =
  'Dark atmospheric background with subtle directional orange light from upper right casting soft gradient, near-black deep shadows in corners, forward momentum feeling, professional, clean, minimal texture, perfect text background, no text, no faces, 4K';

// ─── CTA Prompt ───────────────────────────────────────────────────────────────

const CTA_PROMPT =
  'Dark dramatic stage lighting, single intense orange spotlight circle illuminating center from directly above, deep black surrounding darkness, premium brand atmosphere, theatrical and minimal, high contrast light to shadow, no text, no faces, cinematic, 4K';

// ─── Exported Function ────────────────────────────────────────────────────────

export function generateBackgroundPrompts(
  topic: string,
  topicCategory: TopicCategory,
  keyword: string
): SlideBackgroundPrompts {
  const cat = topicCategory in COVER_PROMPTS ? topicCategory : 'general';
  return {
    cover:  COVER_PROMPTS[cat],
    slide2: SLIDE2_PROMPTS[cat],
    slide3: SLIDE3_PROMPT,
    slide4: SLIDE4_PROMPT,
    cta:    CTA_PROMPT,
    negative: NEGATIVE_PROMPT,
  };
}

// ─── Client-side category detection (mirrors server-side logic) ───────────────

export function detectCategoryClient(topic: string): TopicCategory {
  const t = topic.toLowerCase();
  if (/claude(?!\s*van|\s*monet|\s*de|\s*le)/i.test(t) || /anthropic|mcp\b|claude code/.test(t)) return 'claude-code';
  if (/make\.com|\bmake\b|n8n|zapier|integromat|workflow|automat|onboard/.test(t)) return 'make-automation';
  if (/\bagent\b|\bagents\b|multi.agent|autonomous|agentic/.test(t)) return 'ai-agents';
  return 'business-ai';
}

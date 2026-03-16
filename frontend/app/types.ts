export interface NewsItem {
  id: string; title: string; source: string; url: string; summary: string;
  published_at: string; trending_score: number; topics: string[]; comments: number;
}
export interface TrendingTopic { topic: string; count: number; hot: boolean; }
export interface CodeBlockVisual { type: 'code_block'; language: string; code: string; }
export interface StatsGridVisual { type: 'stats_grid'; stats: { label: string; value: string; icon: string }[]; }
export interface DiagramVisual { type: 'diagram'; title: string; nodes: { id: string; label: string; type: 'input' | 'process' | 'output' }[]; edges: { from: string; to: string }[]; }
export interface StepsListVisual { type: 'steps_list'; steps: { number: number; title: string; desc: string }[]; }
export interface NoneVisual { type: 'none'; }
export type SlideVisual = CodeBlockVisual | StatsGridVisual | DiagramVisual | StepsListVisual | NoneVisual;
export interface CarouselSlide { slide_number: number; type: 'hook'|'context'|'proof'|'how_it_works'|'results'|'cta'; text: string; visual: SlideVisual; }
export interface CarouselData { topic: string; style: string; slides_count: number; slides: CarouselSlide[]; caption: string; hashtags: string[]; created_at: string; }
export interface ResearchData { topic: string; timestamp: string; hook_options: string[]; unique_angles: { angle: string; description: string; why_unique: string }[]; business_applications: string[]; common_mistakes: string[]; roadmap: string[]; metrics: string[]; full_research: string; }

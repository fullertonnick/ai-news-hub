'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SlideVisual, StickerOverlay, TextOverlay } from '../types';

export type { TextOverlay }; // re-export for consumers that import from the store

// ─── Types ────────────────────────────────────────────────────────────────────

export type PipelineStep = 1 | 2 | 3 | 4;
export type BgStatus = 'pending' | 'generating' | 'done' | 'skipped' | 'error';
export interface SlideData {
  id: string;
  text: string;
  accent_word?: string;
  section_label?: string;
  visual_type: string;
  visual?: SlideVisual;
  backgroundImage?: string;
  backgroundPrompt?: string;
  backgroundStatus: BgStatus;
  stickers?: StickerOverlay[];
  textOverlays?: TextOverlay[];
  useTextOverlays?: boolean; // when true, SlideRenderer skips baked-in text
  textOffsetX?: number; // 1080-scale px offset for the baked-in text block (0 = default)
  textOffsetY?: number;
}

interface Approvals {
  copy: boolean;
  visuals: boolean;
  edit: boolean;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface CarouselStore {
  // Pipeline
  currentStep: PipelineStep;
  approvals: Approvals;

  // Topic
  topic: string;
  category: string;
  style: string;

  // Slides
  slides: SlideData[];
  caption: string;
  keyword: string;

  // Loading
  copyLoading: boolean;
  bgLoading: Record<string, boolean>;

  // Cover controls
  coverPosition: 'top' | 'middle' | 'bottom';
  coverPhotoEnabled: boolean;

  // CTA controls
  ctaLayout: 'photo' | 'text';

  // Actions — navigation
  setStep: (step: PipelineStep) => void;
  approve: (key: keyof Approvals) => void;

  // Actions — topic
  setTopic: (topic: string) => void;
  setCategory: (cat: string) => void;
  setStyle: (style: string) => void;

  // Actions — slides (copy editing)
  setSlides: (slides: SlideData[]) => void;
  updateSlideText: (id: string, text: string) => void;
  updateSlideAccent: (id: string, word: string) => void;
  updateSlideVisualType: (id: string, vt: string) => void;
  reorderSlide: (id: string, dir: 'up' | 'down') => void;
  addSlide: (afterIndex: number) => void;
  removeSlide: (id: string) => void;

  // Actions — backgrounds
  setSlideBackground: (id: string, dataUrl: string) => void;
  setSlideBackgroundPrompt: (id: string, prompt: string) => void;
  setSlideBackgroundStatus: (id: string, status: BgStatus) => void;
  setBgLoading: (id: string, loading: boolean) => void;

  // Actions — caption/keyword
  setCaption: (c: string) => void;
  setKeyword: (k: string) => void;
  setCopyLoading: (l: boolean) => void;

  // Actions — cover/CTA
  setCoverPosition: (p: 'top' | 'middle' | 'bottom') => void;
  setCoverPhotoEnabled: (e: boolean) => void;
  setCtaLayout: (l: 'photo' | 'text') => void;

  // Actions — stickers
  addSticker: (slideId: string, sticker: StickerOverlay) => void;
  removeSticker: (slideId: string, stickerId: string) => void;
  updateSticker: (slideId: string, stickerId: string, updates: Partial<StickerOverlay>) => void;

  // Actions — text overlays
  addTextOverlay: (slideId: string, overlay: TextOverlay) => void;
  removeTextOverlay: (slideId: string, overlayId: string) => void;
  updateTextOverlay: (slideId: string, overlayId: string, updates: Partial<TextOverlay>) => void;
  setUseTextOverlays: (slideId: string, value: boolean) => void;
  setTextOffset: (slideId: string, x: number, y: number) => void;

  // Reset
  reset: () => void;
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

const INITIAL: Pick<CarouselStore, 'currentStep' | 'approvals' | 'topic' | 'category' | 'style' | 'slides' | 'caption' | 'keyword' | 'copyLoading' | 'bgLoading' | 'coverPosition' | 'coverPhotoEnabled' | 'ctaLayout'> = {
  currentStep: 1,
  approvals: { copy: false, visuals: false, edit: false },
  topic: '',
  category: '',
  style: 'tech_breakdown',
  slides: [],
  caption: '',
  keyword: '',
  copyLoading: false,
  bgLoading: {},
  coverPosition: 'bottom',
  coverPhotoEnabled: true,
  ctaLayout: 'photo',
};

export const useCarouselStore = create<CarouselStore>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      setStep: (step) => set({ currentStep: step }),

      approve: (key) => set(s => ({ approvals: { ...s.approvals, [key]: true } })),

      setTopic: (topic) => set({ topic }), // just update the topic — reset happens on Generate
      setCategory: (category) => set({ category }),
      setStyle: (style) => set({ style }),

      // ── Slide editing ─────────────────────────────────────────────────────
      // Reset all approvals whenever new slides are loaded (new copy generation clears prior state)
      setSlides: (slides) => set({
        slides,
        approvals: { copy: false, visuals: false, edit: false },
        bgLoading: {},
      }),

      updateSlideText: (id, text) => set(s => {
        const slides = s.slides.map(sl => sl.id === id ? { ...sl, text } : sl);
        // Revoke downstream approvals when copy changes
        return { slides, approvals: { ...s.approvals, visuals: false, edit: false } };
      }),

      updateSlideAccent: (id, word) => set(s => ({
        slides: s.slides.map(sl => sl.id === id ? { ...sl, accent_word: word } : sl),
      })),

      updateSlideVisualType: (id, vt) => set(s => ({
        slides: s.slides.map(sl => sl.id === id ? { ...sl, visual_type: vt } : sl),
      })),

      reorderSlide: (id, dir) => set(s => {
        const idx = s.slides.findIndex(sl => sl.id === id);
        if (idx < 0) return {};
        const target = dir === 'up' ? idx - 1 : idx + 1;
        if (target < 0 || target >= s.slides.length) return {};
        const next = [...s.slides];
        [next[idx], next[target]] = [next[target], next[idx]];
        return { slides: next };
      }),

      addSlide: (afterIndex) => set(s => {
        const newSlide: SlideData = {
          id: uid(), text: 'New slide — edit this text', accent_word: '',
          visual_type: 'none', backgroundStatus: 'pending',
        };
        const next = [...s.slides];
        next.splice(afterIndex + 1, 0, newSlide);
        return { slides: next };
      }),

      removeSlide: (id) => set(s => ({ slides: s.slides.filter(sl => sl.id !== id) })),

      // ── Backgrounds ───────────────────────────────────────────────────────
      setSlideBackground: (id, dataUrl) => set(s => ({
        slides: s.slides.map(sl => sl.id === id ? { ...sl, backgroundImage: dataUrl, backgroundStatus: 'done' as BgStatus } : sl),
      })),

      setSlideBackgroundPrompt: (id, prompt) => set(s => ({
        slides: s.slides.map(sl => sl.id === id ? { ...sl, backgroundPrompt: prompt } : sl),
      })),

      setSlideBackgroundStatus: (id, status) => set(s => ({
        slides: s.slides.map(sl => sl.id === id ? { ...sl, backgroundStatus: status } : sl),
      })),

      setBgLoading: (id, loading) => set(s => ({ bgLoading: { ...s.bgLoading, [id]: loading } })),

      // ── Caption/keyword ───────────────────────────────────────────────────
      setCaption: (caption) => set({ caption }),
      setKeyword: (keyword) => set({ keyword }),
      setCopyLoading: (copyLoading) => set({ copyLoading }),

      // ── Cover/CTA ─────────────────────────────────────────────────────────
      setCoverPosition: (coverPosition) => set({ coverPosition }),
      setCoverPhotoEnabled: (coverPhotoEnabled) => set({ coverPhotoEnabled }),
      setCtaLayout: (ctaLayout) => set({ ctaLayout }),

      // ── Text Overlays ────────────────────────────────────────────────────
      addTextOverlay: (slideId, overlay) => set(s => ({
        slides: s.slides.map(sl => sl.id === slideId
          ? { ...sl, textOverlays: [...(sl.textOverlays || []), overlay] }
          : sl),
      })),

      removeTextOverlay: (slideId, overlayId) => set(s => ({
        slides: s.slides.map(sl => sl.id === slideId
          ? { ...sl, textOverlays: (sl.textOverlays || []).filter(t => t.id !== overlayId) }
          : sl),
      })),

      updateTextOverlay: (slideId, overlayId, updates) => set(s => ({
        slides: s.slides.map(sl => sl.id === slideId
          ? { ...sl, textOverlays: (sl.textOverlays || []).map(t => t.id === overlayId ? { ...t, ...updates } : t) }
          : sl),
      })),

      setUseTextOverlays: (slideId, value) => set(s => ({
        slides: s.slides.map(sl => sl.id === slideId ? { ...sl, useTextOverlays: value } : sl),
      })),

      setTextOffset: (slideId, x, y) => set(s => ({
        slides: s.slides.map(sl => sl.id === slideId ? { ...sl, textOffsetX: x, textOffsetY: y } : sl),
      })),

      // ── Stickers ────────────────────────────────────────────────────────
      addSticker: (slideId, sticker) => set(s => ({
        slides: s.slides.map(sl => sl.id === slideId
          ? { ...sl, stickers: [...(sl.stickers || []), sticker] }
          : sl),
      })),

      removeSticker: (slideId, stickerId) => set(s => ({
        slides: s.slides.map(sl => sl.id === slideId
          ? { ...sl, stickers: (sl.stickers || []).filter(st => st.id !== stickerId) }
          : sl),
      })),

      updateSticker: (slideId, stickerId, updates) => set(s => ({
        slides: s.slides.map(sl => sl.id === slideId
          ? { ...sl, stickers: (sl.stickers || []).map(st => st.id === stickerId ? { ...st, ...updates } : st) }
          : sl),
      })),

      reset: () => set(INITIAL),
    }),
    {
      name: 'simpliscale-carousel-pipeline',
      version: 8,
      migrate: (persisted: any, fromVersion: number) => {
        // On version upgrade: preserve topic/category/slides when schema is compatible,
        // otherwise reset to avoid crashes from stale shape.
        if (fromVersion < 8) {
          return {
            ...INITIAL,
            topic: persisted?.topic || '',
            category: persisted?.category || '',
          };
        }
        return persisted;
      },
    }
  )
);

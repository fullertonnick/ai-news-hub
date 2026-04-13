'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SlideVisual } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PipelineStep = 1 | 2 | 3 | 4 | 5 | 6;
export type BgStatus = 'pending' | 'generating' | 'done' | 'skipped' | 'error';

export interface SlideData {
  id: string;
  text: string;
  accent_word?: string;
  section_label?: string;
  visual_type: string;         // suggested visual type: 'cover_photo' | 'code_block' | 'stats_grid' | etc.
  visual?: SlideVisual;        // full visual data (populated during compose)
  backgroundImage?: string;    // base64 data URL from Imagen 3
  backgroundPrompt?: string;   // the Imagen prompt (editable by user)
  backgroundStatus: BgStatus;
}

interface Approvals {
  copy: boolean;
  backgrounds: boolean;
  cover: boolean;
  cta: boolean;
  compose: boolean;
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

  // Reset
  reset: () => void;
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

const INITIAL: Pick<CarouselStore, 'currentStep' | 'approvals' | 'topic' | 'category' | 'style' | 'slides' | 'caption' | 'keyword' | 'copyLoading' | 'bgLoading' | 'coverPosition' | 'coverPhotoEnabled' | 'ctaLayout'> = {
  currentStep: 1,
  approvals: { copy: false, backgrounds: false, cover: false, cta: false, compose: false },
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

      setTopic: (topic) => set(s => ({ ...INITIAL, topic, style: s.style })), // reset pipeline on new topic, preserve style
      setCategory: (category) => set({ category }),
      setStyle: (style) => set({ style }),

      // ── Slide editing ─────────────────────────────────────────────────────
      setSlides: (slides) => set({ slides }),

      updateSlideText: (id, text) => set(s => {
        const slides = s.slides.map(sl => sl.id === id ? { ...sl, text } : sl);
        // Revoke downstream approvals when copy changes
        return { slides, approvals: { ...s.approvals, backgrounds: false, cover: false, cta: false, compose: false } };
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

      reset: () => set(INITIAL),
    }),
    { name: 'simpliscale-carousel-pipeline' }
  )
);

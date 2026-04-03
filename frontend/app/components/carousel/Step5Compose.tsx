'use client';
import { useState, useRef, useCallback } from 'react';
import { useCarouselStore } from '../../stores/useCarouselStore';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import SlideRenderer from '../SlideRenderer';
import type { CarouselSlide } from '../../types';

export default function Step5Compose() {
  const store = useCarouselStore();
  const { slides, keyword, ctaLayout, coverPhotoEnabled } = store;
  const [currentIdx, setCurrentIdx] = useState(0);

  // Build CarouselSlide objects for rendering
  const renderSlides: CarouselSlide[] = slides.map((s, i) => {
    const isFirst = i === 0;
    const isLast = i === slides.length - 1;

    let visual: any;
    if (isFirst) {
      visual = { type: 'cover_photo', gradient_hue: 25 };
    } else if (isLast) {
      visual = { type: 'cta_slide', keyword, layout_variant: ctaLayout };
    } else {
      // Middle slides — use visual_type or fallback to none
      visual = s.visual || { type: s.visual_type || 'none' };
    }

    return {
      text: s.text,
      accent_word: s.accent_word,
      section_label: s.section_label,
      visual,
      backgroundImage: s.backgroundImage,
    };
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <h3 className="text-sm font-bold text-white">Final Composition</h3>
      <p className="text-xs text-gray-500">Review your full carousel. Click on any text to edit. This is your last chance before export.</p>

      {/* Thumbnail strip */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {slides.map((s, i) => (
          <button key={s.id} onClick={() => setCurrentIdx(i)}
            className={`flex-shrink-0 w-16 rounded-lg border overflow-hidden transition-all ${i === currentIdx ? 'border-brand-orange ring-1 ring-brand-orange/30' : 'border-white/10 opacity-60 hover:opacity-100'}`}
            style={{ aspectRatio: '4/5' }}>
            {s.backgroundImage ? (
              <img src={s.backgroundImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#111] flex items-center justify-center text-[10px] text-gray-600">{i + 1}</div>
            )}
          </button>
        ))}
      </div>

      {/* Main slide viewer */}
      <div className="flex items-center gap-4">
        <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}
          className="p-2 rounded-xl hover:bg-white/5 text-gray-600 hover:text-white disabled:opacity-20 transition-colors">
          <ChevronLeft size={20} />
        </button>

        <div className="flex-1 flex justify-center">
          <div style={{ width: '100%', maxWidth: 400, aspectRatio: '4/5', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 12 }}>
              <div style={{ transform: 'scale(var(--sc, 0.74))', transformOrigin: 'top left', width: 540, height: 675 }}
                ref={el => { if (el) { const w = el.parentElement?.parentElement?.offsetWidth || 400; el.style.setProperty('--sc', String(Math.min(w / 540, 1))); } }}>
                <SlideRenderer slide={renderSlides[currentIdx]} slideNumber={currentIdx + 1} totalSlides={slides.length} />
              </div>
            </div>
          </div>
        </div>

        <button onClick={() => setCurrentIdx(i => Math.min(slides.length - 1, i + 1))} disabled={currentIdx === slides.length - 1}
          className="p-2 rounded-xl hover:bg-white/5 text-gray-600 hover:text-white disabled:opacity-20 transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Editable text for current slide */}
      <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Slide {currentIdx + 1} of {slides.length}</span>
          <span className="text-[10px] text-gray-600 uppercase">{slides[currentIdx]?.visual_type}</span>
        </div>
        <textarea value={slides[currentIdx]?.text || ''} onChange={e => store.updateSlideText(slides[currentIdx].id, e.target.value)}
          className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-200 leading-relaxed resize-none focus:outline-none focus:border-brand-orange/30"
          rows={3} />
      </div>

      <button onClick={() => { store.approve('compose'); store.setStep(6); }}
        className="w-full bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
        <Check size={14} /> Approve Composition & Go to Export
      </button>
    </div>
  );
}

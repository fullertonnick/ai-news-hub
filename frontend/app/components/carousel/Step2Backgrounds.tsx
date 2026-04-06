'use client';
import { useState, useRef } from 'react';
import { useCarouselStore } from '../../stores/useCarouselStore';
import { Loader2, RefreshCw, Check, Image } from 'lucide-react';

// ─── Middle slides don't need Imagen at all ──────────────────────────────────
// Tyler Germain uses pure black. We use near-black. No API call needed.
// This is a 1x1 pixel PNG in #0A0A0A — instant, no network, never fails.
const DARK_BG_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNMY/hfDwADfgHSAuFJ0AAAAABJRU5ErkJggg==';

function buildCoverPrompt(headline: string): string {
  return `Instagram carousel cover slide. Portrait 3:4 ratio. Dark premium design. Full-bleed photograph of a confident male entrepreneur at a desk. Heavy dark overlay 65% opacity black. The headline "${headline}" rendered in massive bold white sans-serif font, lower-third, left-aligned. One key word in orange #FF7107. Small @thenickcornelius bottom-left, save for later bottom-right. Crisp text, moody photo, editorial. No clutter.`;
}

function buildCTAPrompt(ctaText: string, keyword: string): string {
  return `Instagram carousel CTA slide. Portrait 3:4 ratio. Near-black background, minimal. "${ctaText}" in bold white sans-serif centered. Small orange line divider below. Then "Comment" in white, "${keyword}" in solid orange rounded pill with black text, "I'll send it over" in white, all on one line centered. Small orange arrow below. @thenickcornelius bottom-left, save for later bottom-right. Clean dark mode, crisp text. No photos, no complexity.`;
}

type SlotId = 'cover' | 'middle' | 'cta';
type SlotStatus = 'idle' | 'generating' | 'done' | 'error';

export default function Step2Backgrounds() {
  const slides = useCarouselStore(s => s.slides);
  const keyword = useCarouselStore(s => s.keyword);
  const setSlideBackground = useCarouselStore(s => s.setSlideBackground);
  const setSlideBackgroundStatus = useCarouselStore(s => s.setSlideBackgroundStatus);
  const setSlideBackgroundPrompt = useCarouselStore(s => s.setSlideBackgroundPrompt);
  const approve = useCarouselStore(s => s.approve);
  const setStep = useCarouselStore(s => s.setStep);

  // Local state only — no zustand updates during generation (prevents re-render loops)
  const [slotStatus, setSlotStatus] = useState<Record<SlotId, SlotStatus>>({ cover: 'idle', middle: 'done', cta: 'idle' });
  const [slotImages, setSlotImages] = useState<Record<SlotId, string>>({ cover: '', middle: DARK_BG_PIXEL, cta: '' });
  const [error, setError] = useState('');
  const busyRef = useRef(false);

  const coverSlide = slides[0];
  const ctaSlide = slides[slides.length - 1];
  const middleSlides = slides.slice(1, -1);

  // Apply middle background immediately (no API call)
  const applyMiddle = () => {
    middleSlides.forEach(s => {
      setSlideBackground(s.id, DARK_BG_PIXEL);
      setSlideBackgroundPrompt(s.id, 'Solid near-black #0A0A0A (no Imagen needed)');
    });
  };

  const generateSlot = async (slotId: 'cover' | 'cta') => {
    const slide = slotId === 'cover' ? coverSlide : ctaSlide;
    if (!slide) return;

    const prompt = slotId === 'cover'
      ? buildCoverPrompt(slide.text)
      : buildCTAPrompt(slide.text, keyword || 'BUILD');

    setSlotStatus(prev => ({ ...prev, [slotId]: 'generating' }));
    setError('');

    try {
      const r = await fetch('/api/imagen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const d = await r.json();
      if (d.dataUrl) {
        setSlotImages(prev => ({ ...prev, [slotId]: d.dataUrl }));
        setSlotStatus(prev => ({ ...prev, [slotId]: 'done' }));
        // Write to store
        setSlideBackground(slide.id, d.dataUrl);
        setSlideBackgroundPrompt(slide.id, prompt);
      } else {
        setSlotStatus(prev => ({ ...prev, [slotId]: 'error' }));
        setError(`${slotId} failed — try regenerating`);
      }
    } catch {
      setSlotStatus(prev => ({ ...prev, [slotId]: 'error' }));
      setError(`${slotId} failed — try regenerating`);
    }
  };

  const generateAll = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setError('');

    // Middle is instant — apply immediately
    applyMiddle();

    // Cover and CTA in parallel
    await Promise.allSettled([generateSlot('cover'), generateSlot('cta')]);
    busyRef.current = false;
  };

  const anyGenerating = slotStatus.cover === 'generating' || slotStatus.cta === 'generating';
  const allDone = slotStatus.cover === 'done' && slotStatus.middle === 'done' && slotStatus.cta === 'done';

  const handleApprove = () => {
    // Make sure store has all backgrounds
    applyMiddle();
    approve('backgrounds');
    setStep(3);
  };

  const SLOTS: { id: SlotId; label: string; desc: string; final: boolean }[] = [
    { id: 'cover', label: 'Cover Slide', desc: 'Your photo + dark overlay + headline', final: true },
    { id: 'middle', label: 'Content Background', desc: 'Clean dark surface — no distractions', final: false },
    { id: 'cta', label: 'CTA Slide', desc: 'Comment keyword mechanic', final: true },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Generate Visuals</h3>
          <p className="text-xs text-gray-500 mt-0.5">Cover + CTA rendered by AI. Content slides use a clean dark background (instant).</p>
        </div>
        <button onClick={generateAll} disabled={anyGenerating}
          className="flex items-center gap-1.5 bg-brand-orange hover:bg-orange-500 disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
          {anyGenerating ? <Loader2 size={14} className="animate-spin" /> : <Image size={14} />}
          {anyGenerating ? 'Generating...' : 'Generate All'}
        </button>
      </div>

      {error && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}

      <div className="space-y-3">
        {SLOTS.map(slot => {
          const status = slotStatus[slot.id];
          const imageUrl = slotImages[slot.id];
          const slideText = slot.id === 'cover' ? coverSlide?.text : slot.id === 'cta' ? ctaSlide?.text : undefined;

          return (
            <div key={slot.id} className={`rounded-xl border overflow-hidden ${slot.final ? 'bg-brand-orange/[0.03] border-brand-orange/20' : 'bg-white/[0.03] border-white/10'}`}>
              <div className="flex">
                {/* Info */}
                <div className="flex-1 p-4 border-r border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider">{slot.label}</span>
                    {slot.final && <span className="text-[9px] bg-brand-orange/20 text-brand-orange px-1.5 py-0.5 rounded-full">FINAL</span>}
                    {!slot.final && <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">INSTANT</span>}
                  </div>
                  <p className="text-xs text-gray-400">{slot.desc}</p>
                  {slideText && <p className="text-xs text-white font-medium mt-2">"{slideText}"</p>}
                  {slot.id === 'cta' && <p className="text-[10px] text-brand-orange mt-1">Keyword: {keyword || 'BUILD'}</p>}
                </div>

                {/* Preview */}
                <div className="w-36 flex-shrink-0 bg-black flex items-center justify-center" style={{ minHeight: 180 }}>
                  {imageUrl && imageUrl !== DARK_BG_PIXEL ? (
                    <img src={imageUrl} alt="" className="w-full h-full object-cover" style={{ aspectRatio: '3/4' }} />
                  ) : status === 'generating' ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-brand-orange" />
                      <span className="text-[10px] text-gray-500">~10-15s</span>
                    </div>
                  ) : status === 'error' ? (
                    <span className="text-[10px] text-red-400 text-center px-2">Failed</span>
                  ) : status === 'done' && slot.id === 'middle' ? (
                    <div className="w-full h-full bg-[#0A0A0A] flex items-center justify-center">
                      <span className="text-[10px] text-gray-700">Dark bg</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-700">Click generate</span>
                  )}
                </div>
              </div>

              {/* Regenerate button (only for cover + CTA) */}
              {slot.final && (
                <div className="border-t border-white/5 px-4 py-2">
                  <button onClick={() => generateSlot(slot.id as 'cover' | 'cta')} disabled={status === 'generating'}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1 disabled:opacity-40">
                    <RefreshCw size={11} /> {imageUrl ? 'Regenerate' : 'Generate'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={handleApprove} disabled={!allDone}
        className="w-full bg-green-500/20 hover:bg-green-500/30 disabled:opacity-30 border border-green-500/30 text-green-400 font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
        <Check size={14} /> Approve & Continue
      </button>
    </div>
  );
}

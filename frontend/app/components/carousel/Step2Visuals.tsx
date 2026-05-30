'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useCarouselStore } from '../../stores/useCarouselStore';
import { Loader2, RefreshCw, Check, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { NICK_PHOTOS, pickRandomPhoto } from '../../lib/nickPhotos';
import { toDataUrl as proxyPhoto } from '../../lib/imageProxy';
import SlideRenderer from '../SlideRenderer';

export default function Step2Visuals() {
  const store = useCarouselStore();
  const { slides, topic, category, keyword, coverPosition, ctaLayout } = store;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [bgError, setBgError] = useState<Record<string, string>>({});
  const [photoLoading, setPhotoLoading] = useState(false);
  const [ctaPhotoLoading, setCtaPhotoLoading] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.667);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Extract slide IDs so photo effects re-run when slides are regenerated (new IDs = new copy generation)
  const coverSlideId = slides[0]?.id;
  const ctaSlideId = slides[slides.length - 1]?.id;

  const slide = slides[currentIdx];
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === slides.length - 1;
  const isMiddle = !isFirst && !isLast;

  // Cover/CTA photo index
  const busyRef = useRef<Record<string, boolean>>({});

  const [coverPhotoIdx, setCoverPhotoIdx] = useState(() => {
    const idx = NICK_PHOTOS.indexOf(pickRandomPhoto((topic || '') + 'cover'));
    return idx >= 0 ? idx : 0;
  });
  const [ctaPhotoIdx, setCtaPhotoIdx] = useState(() => {
    const idx = NICK_PHOTOS.indexOf(pickRandomPhoto((topic || '') + 'cta'));
    return idx >= 0 ? idx : 1 % NICK_PHOTOS.length;
  });

  // Use refs so the effects always see the current slide IDs without triggering on every slide change.
  const slidesRef = useRef(slides);
  useEffect(() => { slidesRef.current = slides; }, [slides]);

  // Responsive preview scale — mirrors Step4Export's approach.
  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;
    const update = () => setPreviewScale((el.offsetWidth || 360) / 540);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Clamp currentIdx when slides array shrinks (e.g. after copy regeneration with fewer slides)
  useEffect(() => {
    if (slides.length > 0 && currentIdx >= slides.length) {
      setCurrentIdx(slides.length - 1);
    }
  }, [slides.length, currentIdx]);

  // Auto-apply cover photo — proxy to data URL without clobbering an existing data URL first.
  // Skipping the "set raw URL immediately" step prevents the visible flash when navigating
  // back to Step2 (the slide keeps its existing background while re-proxying completes).
  // Use getState() for actions so `store` is not a reactive dependency (avoids re-render loop).
  useEffect(() => {
    const c = slidesRef.current[0];
    if (!c) return;
    const slideId = c.id;
    const rawUrl = NICK_PHOTOS[coverPhotoIdx];
    let cancelled = false;
    setPhotoLoading(true);
    proxyPhoto(rawUrl).then(dataUrl => {
      if (!cancelled) useCarouselStore.getState().setSlideBackground(slideId, dataUrl);
    }).finally(() => { if (!cancelled) setPhotoLoading(false); });
    return () => { cancelled = true; };
  }, [coverPhotoIdx, coverSlideId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-apply CTA photo — proxy to data URL (same flash-prevention approach as cover)
  useEffect(() => {
    const allSlides = slidesRef.current;
    const c = allSlides[allSlides.length - 1];
    if (!c) return;
    const slideId = c.id;
    const rawUrl = NICK_PHOTOS[ctaPhotoIdx];
    let cancelled = false;
    setCtaPhotoLoading(true);
    proxyPhoto(rawUrl).then(dataUrl => {
      if (!cancelled) useCarouselStore.getState().setSlideBackground(slideId, dataUrl);
    }).finally(() => { if (!cancelled) setCtaPhotoLoading(false); });
    return () => { cancelled = true; };
  }, [ctaPhotoIdx, ctaSlideId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate middle slide background.
  // Uses getState() for Zustand actions so the callback doesn't need `store` in deps,
  // which would otherwise cause stale closures and excessive re-creations.
  const generateBg = useCallback(async (slideId: string, slideText: string, slideType: string) => {
    if (busyRef.current[slideId]) return;
    busyRef.current[slideId] = true;
    setGenerating(prev => ({ ...prev, [slideId]: true }));
    setBgError(prev => ({ ...prev, [slideId]: '' }));
    useCarouselStore.getState().setSlideBackgroundStatus(slideId, 'generating');
    try {
      const pr = await fetch('/api/carousel/generate-bg-prompt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, slideText, slideType, category }),
      });
      const pd = await pr.json();
      const prompt = pd.prompt || `Dark cinematic workspace, warm orange desk lamp glow, deep shadows, no text, no faces, bokeh`;
      useCarouselStore.getState().setSlideBackgroundPrompt(slideId, prompt);

      const ir = await fetch('/api/imagen', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const id = await ir.json();
      if (id.dataUrl) {
        useCarouselStore.getState().setSlideBackground(slideId, id.dataUrl);
      } else {
        const msg = id.error || 'Image generation returned no result';
        setBgError(prev => ({ ...prev, [slideId]: msg }));
        useCarouselStore.getState().setSlideBackgroundStatus(slideId, 'error');
      }
    } catch (e) {
      console.error('Background generation failed:', e);
      setBgError(prev => ({ ...prev, [slideId]: 'Network error — try again' }));
      useCarouselStore.getState().setSlideBackgroundStatus(slideId, 'error');
    } finally {
      busyRef.current[slideId] = false;
      setGenerating(prev => ({ ...prev, [slideId]: false }));
    }
  }, [topic, category]); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate MISSING middle backgrounds one-at-a-time (skips slides that already have images).
  // Use this for auto-generation and the primary button — avoids expensive re-generation.
  const generateAll = useCallback(async () => {
    for (const s of slides.slice(1, -1)) {
      if (!busyRef.current[s.id] && !s.backgroundImage) {
        await generateBg(s.id, s.text, s.visual_type || 'none');
        await new Promise(r => setTimeout(r, 400));
      }
    }
  }, [slides, generateBg]);

  // Regenerate ALL middle backgrounds, including ones that already have images.
  const regenerateAll = useCallback(async () => {
    for (const s of slides.slice(1, -1)) {
      if (!busyRef.current[s.id]) {
        await generateBg(s.id, s.text, s.visual_type || 'none');
        await new Promise(r => setTimeout(r, 400));
      }
    }
  }, [slides, generateBg]);

  // Auto-generate middle backgrounds when slides arrive without images.
  // Tracks the current slide-set by ID so it re-fires correctly after copy is regenerated.
  const lastAutoStartKey = useRef<string>('');
  useEffect(() => {
    const slidesKey = slides.map(s => s.id).join(',');
    if (lastAutoStartKey.current === slidesKey) return; // already started for this slide set
    const middle = slides.slice(1, -1);
    if (!middle.length) return;
    if (!middle.some(s => !s.backgroundImage)) return; // all already have images
    lastAutoStartKey.current = slidesKey;
    // Small delay so cover/CTA photo effects finish first
    const t = setTimeout(generateAll, 600);
    return () => clearTimeout(t);
  }, [slides, generateAll]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!slide) return <div className="p-6"><p className="text-sm text-gray-400">No slides. Generate copy first.</p></div>;

  // Build render slide for preview
  let visual: any;
  if (isFirst) visual = { type: 'cover_photo', gradient_hue: 25, position: coverPosition };
  else if (isLast) visual = { type: 'cta_slide', keyword, layout_variant: ctaLayout };
  else visual = slide.visual || { type: slide.visual_type || 'none' };
  const renderSlide = {
    text: slide.text,
    accent_word: slide.accent_word,
    section_label: slide.section_label,
    visual,
    backgroundImage: slide.backgroundImage,
    stickers: slide.stickers,
    textOverlays: slide.textOverlays,
    useTextOverlays: slide.useTextOverlays,
    textOffsetX: slide.useTextOverlays ? 0 : slide.textOffsetX,
    textOffsetY: slide.useTextOverlays ? 0 : slide.textOffsetY,
  };

  const middleSlides = slides.slice(1, -1);
  const bgDone = middleSlides.filter(s => s.backgroundImage).length;
  const bgMissing = middleSlides.filter(s => !s.backgroundImage).length;
  const allGenerating = Object.values(generating).some(Boolean);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Visuals</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Cover & CTA use your photos. Content slides get AI-generated backgrounds.
            {middleSlides.length > 0 && (
              <span className={`ml-2 font-medium ${bgDone === middleSlides.length ? 'text-green-400' : 'text-gray-500'}`}>
                {bgDone}/{middleSlides.length} backgrounds ready
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-1.5">
          {bgMissing > 0 && (
            <button onClick={generateAll} disabled={allGenerating}
              className="text-xs font-bold text-black bg-brand-orange hover:bg-orange-500 disabled:opacity-40 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5">
              {allGenerating && <Loader2 size={10} className="animate-spin" />}
              {allGenerating ? 'Generating...' : `Generate Missing (${bgMissing})`}
            </button>
          )}
          {bgDone > 0 && (
            <button onClick={regenerateAll} disabled={allGenerating}
              className="text-xs font-medium text-gray-400 hover:text-white border border-white/10 hover:border-white/20 disabled:opacity-40 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5">
              <RefreshCw size={10} /> Regen All
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Preview */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}
              className="p-1.5 rounded-lg hover:bg-white/5 text-gray-600 hover:text-white disabled:opacity-20"><ChevronLeft size={16} /></button>
            <span className="text-xs text-gray-400 font-medium">Slide {currentIdx + 1} / {slides.length}</span>
            <button onClick={() => setCurrentIdx(i => Math.min(slides.length - 1, i + 1))} disabled={currentIdx === slides.length - 1}
              className="p-1.5 rounded-lg hover:bg-white/5 text-gray-600 hover:text-white disabled:opacity-20"><ChevronRight size={16} /></button>
            <span className="ml-auto text-[10px] text-gray-600 uppercase">{isFirst ? 'Cover' : isLast ? 'CTA' : slide.visual_type?.replace(/_/g, ' ') || 'Content'}</span>
          </div>

          <div ref={previewContainerRef} style={{ width: '100%', maxWidth: 360, aspectRatio: '4/5', position: 'relative', margin: '0 auto', overflow: 'hidden', borderRadius: 12 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 540, height: 675, transform: `scale(${previewScale})`, transformOrigin: 'top left' }}>
              <SlideRenderer slide={renderSlide} slideNumber={currentIdx + 1} totalSlides={slides.length} />
            </div>
          </div>

          {/* Thumbnails */}
          <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
            {slides.map((s, i) => (
              <button key={s.id} onClick={() => setCurrentIdx(i)}
                className={`flex-shrink-0 w-12 rounded-lg border overflow-hidden transition-all ${i === currentIdx ? 'border-brand-orange ring-1 ring-brand-orange/30' : 'border-white/10 opacity-50 hover:opacity-100'}`}
                style={{ aspectRatio: '4/5' }}>
                {s.backgroundImage ? <img src={s.backgroundImage} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-[#111] flex items-center justify-center text-[9px] text-gray-600">{i + 1}</div>}
              </button>
            ))}
          </div>
        </div>

        {/* Controls — context-sensitive */}
        <div className="w-full lg:w-72 space-y-4">
          {/* Cover controls */}
          {isFirst && (
            <>
              <div>
                <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Headline</div>
                <textarea value={slide.text} onChange={e => store.updateSlideText(slide.id, e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-brand-orange/30" rows={3} />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Accent Word</div>
                <input type="text" value={slide.accent_word || ''} onChange={e => store.updateSlideAccent(slide.id, e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-sm text-brand-orange focus:outline-none focus:border-brand-orange/30" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Headline Position</div>
                <div className="flex gap-1.5">
                  {(['top', 'middle', 'bottom'] as const).map(p => (
                    <button key={p} onClick={() => store.setCoverPosition(p)}
                      className={`flex-1 text-xs py-1.5 rounded-lg border transition-all capitalize ${coverPosition === p ? 'border-brand-orange/40 bg-brand-orange/10 text-brand-orange' : 'border-white/10 text-gray-500'}`}>{p}</button>
                  ))}
                </div>
              </div>
              <button onClick={() => setCoverPhotoIdx(i => (i + 1) % NICK_PHOTOS.length)} disabled={photoLoading}
                className="w-full flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium py-2.5 rounded-xl transition-colors disabled:opacity-40">
                {photoLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                {photoLoading ? 'Loading Photo...' : 'Shuffle Photo'}
              </button>
            </>
          )}

          {/* CTA controls */}
          {isLast && (
            <>
              <div>
                <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">CTA Headline</div>
                <textarea value={slide.text} onChange={e => store.updateSlideText(slide.id, e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-brand-orange/30" rows={2} />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Keyword</div>
                <input type="text" value={keyword} onChange={e => store.setKeyword(e.target.value.toUpperCase())}
                  className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-sm text-brand-orange font-bold uppercase focus:outline-none focus:border-brand-orange/30" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Layout</div>
                <div className="flex gap-1.5">
                  {(['photo', 'text'] as const).map(l => (
                    <button key={l} onClick={() => store.setCtaLayout(l)}
                      className={`flex-1 text-xs py-1.5 rounded-lg border transition-all ${ctaLayout === l ? 'border-brand-orange/40 bg-brand-orange/10 text-brand-orange' : 'border-white/10 text-gray-500'}`}>
                      {l === 'photo' ? 'Photo + Text' : 'Text Only'}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setCtaPhotoIdx(i => (i + 1) % NICK_PHOTOS.length)} disabled={ctaPhotoLoading}
                className="w-full flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium py-2.5 rounded-xl transition-colors disabled:opacity-40">
                {ctaPhotoLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                {ctaPhotoLoading ? 'Loading Photo...' : 'Shuffle Photo'}
              </button>
            </>
          )}

          {/* Middle slide controls */}
          {isMiddle && (
            <>
              <div>
                <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Slide Text</div>
                <textarea value={slide.text} onChange={e => store.updateSlideText(slide.id, e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-200 leading-relaxed resize-none focus:outline-none focus:border-brand-orange/30" rows={4} />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Accent Word</div>
                <input type="text" value={slide.accent_word || ''} onChange={e => store.updateSlideAccent(slide.id, e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-sm text-brand-orange focus:outline-none focus:border-brand-orange/30" />
              </div>
              <button onClick={() => generateBg(slide.id, slide.text, slide.visual_type || 'none')} disabled={generating[slide.id]}
                className="w-full flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium py-2.5 rounded-xl transition-colors disabled:opacity-40">
                {generating[slide.id] ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                {generating[slide.id] ? 'Generating...' : slide.backgroundImage ? 'Regenerate Background' : 'Generate Background'}
              </button>
              {bgError[slide.id] && (
                <div className="flex items-center gap-1.5 text-[10px] text-red-400">
                  <AlertCircle size={10} /> {bgError[slide.id]}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => store.setStep(1)}
          className="flex-none bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white font-medium py-3 px-5 rounded-xl transition-colors text-sm">
          ← Back
        </button>
        <button onClick={() => { store.approve('visuals'); store.setStep(3); }}
          className="flex-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
          <Check size={14} /> Continue to Editor{allGenerating ? ' (backgrounds still loading…)' : ''}
        </button>
      </div>
    </div>
  );
}

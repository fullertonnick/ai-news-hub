'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useCarouselStore } from '../../stores/useCarouselStore';
import { Loader2, RefreshCw, Check, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { NICK_PHOTOS } from '../../lib/nickPhotos';
import SlideRenderer from '../SlideRenderer';

export default function Step2Visuals() {
  const store = useCarouselStore();
  const { slides, topic, category, keyword, coverPosition, ctaLayout } = store;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [bgError, setBgError] = useState<Record<string, string>>({});

  const slide = slides[currentIdx];
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === slides.length - 1;
  const isMiddle = !isFirst && !isLast;

  // Cover/CTA photo index
  const [coverPhotoIdx, setCoverPhotoIdx] = useState(() => {
    const seed = (topic || '') + 'cover';
    let h = 0; for (let i = 0; i < seed.length; i++) { h = ((h << 5) - h) + seed.charCodeAt(i); h |= 0; }
    return Math.abs(h) % NICK_PHOTOS.length;
  });
  const [ctaPhotoIdx, setCtaPhotoIdx] = useState(() => {
    const seed = (topic || '') + 'cta';
    let h = 0; for (let i = 0; i < seed.length; i++) { h = ((h << 5) - h) + seed.charCodeAt(i); h |= 0; }
    return Math.abs(h) % NICK_PHOTOS.length;
  });

  // Auto-apply cover + CTA photos
  useEffect(() => {
    const c = slides[0];
    if (c) { store.setSlideBackground(c.id, NICK_PHOTOS[coverPhotoIdx]); }
  }, [coverPhotoIdx]); // eslint-disable-line
  useEffect(() => {
    const c = slides[slides.length - 1];
    if (c) { store.setSlideBackground(c.id, NICK_PHOTOS[ctaPhotoIdx]); }
  }, [ctaPhotoIdx]); // eslint-disable-line

  const busyRef = useRef<Record<string, boolean>>({});

  // Generate middle slide background
  const generateBg = useCallback(async (slideId: string, slideText: string, slideType: string) => {
    if (busyRef.current[slideId]) return;
    busyRef.current[slideId] = true;
    setGenerating(prev => ({ ...prev, [slideId]: true }));
    setBgError(prev => ({ ...prev, [slideId]: '' }));
    store.setSlideBackgroundStatus(slideId, 'generating');
    try {
      const pr = await fetch('/api/carousel/generate-bg-prompt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, slideText, slideType, category }),
      });
      const pd = await pr.json();
      const prompt = pd.prompt || `Dark cinematic workspace, warm orange desk lamp glow, deep shadows, no text, no faces, bokeh`;
      store.setSlideBackgroundPrompt(slideId, prompt);

      const ir = await fetch('/api/imagen', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const id = await ir.json();
      if (id.dataUrl) {
        store.setSlideBackground(slideId, id.dataUrl);
      } else {
        const msg = id.error || 'Image generation returned no result';
        setBgError(prev => ({ ...prev, [slideId]: msg }));
        store.setSlideBackgroundStatus(slideId, 'error');
      }
    } catch {
      setBgError(prev => ({ ...prev, [slideId]: 'Network error — try again' }));
      store.setSlideBackgroundStatus(slideId, 'error');
    }
    busyRef.current[slideId] = false;
    setGenerating(prev => ({ ...prev, [slideId]: false }));
  }, [topic, category, store]); // eslint-disable-line

  // Generate ALL middle backgrounds sequentially
  const generateAll = useCallback(async () => {
    for (const s of slides.slice(1, -1)) {
      if (!busyRef.current[s.id]) {
        generateBg(s.id, s.text, s.visual_type || 'none');
        await new Promise(r => setTimeout(r, 600));
      }
    }
  }, [slides, generateBg]);

  if (!slide) return <div className="p-6"><p className="text-sm text-gray-400">No slides. Generate copy first.</p></div>;

  // Build render slide for preview
  let visual: any;
  if (isFirst) visual = { type: 'cover_photo', gradient_hue: 25, position: coverPosition };
  else if (isLast) visual = { type: 'cta_slide', keyword, layout_variant: ctaLayout };
  else visual = slide.visual || { type: slide.visual_type || 'none' };
  const renderSlide = { text: slide.text, accent_word: slide.accent_word, section_label: slide.section_label, visual, backgroundImage: slide.backgroundImage, stickers: slide.stickers, textOverlays: slide.textOverlays };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Visuals</h3>
          <p className="text-xs text-gray-500 mt-0.5">Set backgrounds for each slide. Cover & CTA use your photos, content slides get AI backgrounds.</p>
        </div>
        <button onClick={generateAll} disabled={Object.values(generating).some(Boolean)}
          className="text-xs font-bold text-black bg-brand-orange hover:bg-orange-500 disabled:opacity-40 px-4 py-2 rounded-lg transition-colors">
          Generate All Backgrounds
        </button>
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

          <div style={{ width: '100%', maxWidth: 360, aspectRatio: '4/5', position: 'relative', margin: '0 auto', overflow: 'hidden', borderRadius: 12 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 540, height: 675, transform: 'scale(0.667)', transformOrigin: 'top left' }}>
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
              <button onClick={() => setCoverPhotoIdx(i => (i + 1) % NICK_PHOTOS.length)}
                className="w-full flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium py-2.5 rounded-xl transition-colors">
                <RefreshCw size={12} /> Shuffle Photo
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
              <button onClick={() => setCtaPhotoIdx(i => (i + 1) % NICK_PHOTOS.length)}
                className="w-full flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium py-2.5 rounded-xl transition-colors">
                <RefreshCw size={12} /> Shuffle Photo
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

      <button onClick={() => { store.approve('visuals'); store.setStep(3); }}
        className="w-full bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
        <Check size={14} /> Continue to Editor
      </button>
    </div>
  );
}

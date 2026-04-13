'use client';
import { useCallback, useState } from 'react';
import { useCarouselStore } from '../../stores/useCarouselStore';
import { RefreshCw, Check, Loader2, AlertCircle } from 'lucide-react';
import SlideRenderer from '../SlideRenderer';

export default function Step4CTA() {
  const store = useCarouselStore();
  const { slides, keyword, ctaLayout, bgLoading, topic, category } = store;
  const ctaSlide = slides[slides.length - 1];
  const [bgError, setBgError] = useState(false);
  if (!ctaSlide) return null;

  const loading = bgLoading[ctaSlide.id] || false;

  const regenerateCtaBg = useCallback(async () => {
    setBgError(false);
    store.setBgLoading(ctaSlide.id, true);
    try {
      const r = await fetch('/api/carousel/generate-bg-prompt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, slideText: ctaSlide.text, slideType: 'cta_slide', category }),
      });
      if (!r.ok) throw new Error(`Prompt API ${r.status}`);
      const d = await r.json();
      const prompt = d.prompt || '';
      store.setSlideBackgroundPrompt(ctaSlide.id, prompt);
      const r2 = await fetch('/api/imagen', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, negative_prompt: '' }),
      });
      if (!r2.ok) throw new Error(`Imagen API ${r2.status}`);
      const d2 = await r2.json();
      if (d2.dataUrl) {
        store.setSlideBackground(ctaSlide.id, d2.dataUrl);
      } else {
        throw new Error('No image returned');
      }
    } catch (err) {
      console.error('CTA bg generation failed:', err);
      setBgError(true);
    }
    store.setBgLoading(ctaSlide.id, false);
  }, [ctaSlide, topic, category, store]);

  const renderSlide = {
    text: ctaSlide.text,
    accent_word: ctaSlide.accent_word,
    visual: { type: 'cta_slide' as const, keyword, layout_variant: ctaLayout as 'photo' | 'text' },
    backgroundImage: ctaSlide.backgroundImage,
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <h3 className="text-sm font-bold text-white">CTA Slide</h3>
      <p className="text-xs text-gray-500">Configure your call-to-action. Users comment the keyword to get your lead magnet.</p>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Preview */}
        <div className="flex-1 flex justify-center">
          <div style={{ width: 360, aspectRatio: '4/5', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 12, transform: 'scale(0.667)', transformOrigin: 'top left', width: 540, height: 675 }}>
              <SlideRenderer slide={renderSlide} slideNumber={slides.length} totalSlides={slides.length} />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="w-full lg:w-72 space-y-4">
          <div>
            <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">CTA Headline</div>
            <textarea value={ctaSlide.text} onChange={e => store.updateSlideText(ctaSlide.id, e.target.value)}
              className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-brand-orange/30"
              rows={2} />
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
                  className={`flex-1 text-xs py-1.5 rounded-lg border transition-all capitalize ${ctaLayout === l ? 'border-brand-orange/40 bg-brand-orange/10 text-brand-orange' : 'border-white/10 text-gray-500'}`}>
                  {l === 'photo' ? 'Photo + Text' : 'Text Only'}
                </button>
              ))}
            </div>
          </div>

          <button onClick={regenerateCtaBg} disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium py-2.5 rounded-xl transition-colors disabled:opacity-40">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {loading ? 'Generating...' : 'Regenerate CTA Background'}
          </button>
          {bgError && (
            <div className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle size={12} /> Background generation failed — check API key or try again
            </div>
          )}
        </div>
      </div>

      <button onClick={() => { store.approve('cta'); store.setStep(5); }}
        className="w-full bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
        <Check size={14} /> Approve CTA & Continue to Compose
      </button>
    </div>
  );
}

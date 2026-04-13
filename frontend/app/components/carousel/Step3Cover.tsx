'use client';
import { useCallback, useState } from 'react';
import { useCarouselStore } from '../../stores/useCarouselStore';
import { RefreshCw, Check, Loader2, User, AlertCircle } from 'lucide-react';
import SlideRenderer from '../SlideRenderer';

export default function Step3Cover() {
  const store = useCarouselStore();
  const { slides, coverPosition, coverPhotoEnabled, bgLoading, topic, category } = store;
  const coverSlide = slides[0];
  const [bgError, setBgError] = useState(false);
  if (!coverSlide) return null;

  const loading = bgLoading[coverSlide.id] || false;

  const regenerateCoverBg = useCallback(async () => {
    setBgError(false);
    store.setBgLoading(coverSlide.id, true);
    try {
      const r = await fetch('/api/carousel/generate-bg-prompt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, slideText: coverSlide.text, slideType: 'cover_photo', category }),
      });
      if (!r.ok) throw new Error(`Prompt API ${r.status}`);
      const d = await r.json();
      const prompt = d.prompt || '';
      store.setSlideBackgroundPrompt(coverSlide.id, prompt);

      const r2 = await fetch('/api/imagen', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, negative_prompt: '' }),
      });
      if (!r2.ok) throw new Error(`Imagen API ${r2.status}`);
      const d2 = await r2.json();
      if (d2.dataUrl) {
        store.setSlideBackground(coverSlide.id, d2.dataUrl);
      } else {
        throw new Error('No image returned');
      }
    } catch (err) {
      console.error('Cover bg generation failed:', err);
      setBgError(true);
    }
    store.setBgLoading(coverSlide.id, false);
  }, [coverSlide, topic, category, store]);

  // Build a CarouselSlide object for SlideRenderer
  // Pass position + photo_enabled so CoverTemplate actually responds to controls
  const renderSlide = {
    text: coverSlide.text,
    accent_word: coverSlide.accent_word,
    visual: {
      type: 'cover_photo' as const,
      gradient_hue: 25,
      position: coverPosition,
      photo_enabled: coverPhotoEnabled,
    },
    // Only pass backgroundImage when photo is enabled
    backgroundImage: coverPhotoEnabled ? coverSlide.backgroundImage : undefined,
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <h3 className="text-sm font-bold text-white">Cover Slide</h3>
      <p className="text-xs text-gray-500">Preview your cover slide. Edit the headline, toggle Nick's photo, and regenerate the background.</p>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Preview */}
        <div className="flex-1 flex justify-center">
          <div style={{ width: 360, aspectRatio: '4/5', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 12, transform: 'scale(0.667)', transformOrigin: 'top left', width: 540, height: 675 }}>
              <SlideRenderer slide={renderSlide} slideNumber={1} totalSlides={slides.length} />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="w-full lg:w-72 space-y-4">
          <div>
            <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Headline</div>
            <textarea value={coverSlide.text} onChange={e => store.updateSlideText(coverSlide.id, e.target.value)}
              className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-brand-orange/30"
              rows={3} />
          </div>

          <div>
            <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Accent Word</div>
            <input type="text" value={coverSlide.accent_word || ''} onChange={e => store.updateSlideAccent(coverSlide.id, e.target.value)}
              className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-sm text-brand-orange focus:outline-none focus:border-brand-orange/30" />
          </div>

          <div>
            <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Headline Position</div>
            <div className="flex gap-1.5">
              {(['top', 'middle', 'bottom'] as const).map(p => (
                <button key={p} onClick={() => store.setCoverPosition(p)}
                  className={`flex-1 text-xs py-1.5 rounded-lg border transition-all capitalize ${coverPosition === p ? 'border-brand-orange/40 bg-brand-orange/10 text-brand-orange' : 'border-white/10 text-gray-500'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Nick's Photo</div>
            <button onClick={() => store.setCoverPhotoEnabled(!coverPhotoEnabled)}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-xs transition-all ${coverPhotoEnabled ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-white/10 text-gray-500'}`}>
              <User size={14} /> {coverPhotoEnabled ? 'Photo Enabled' : 'Photo Disabled'}
            </button>
          </div>

          <button onClick={regenerateCoverBg} disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium py-2.5 rounded-xl transition-colors disabled:opacity-40">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {loading ? 'Generating...' : 'Regenerate Cover Background'}
          </button>
          {bgError && (
            <div className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle size={12} /> Background generation failed — check API key or try again
            </div>
          )}
        </div>
      </div>

      <button onClick={() => { store.approve('cover'); store.setStep(4); }}
        className="w-full bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
        <Check size={14} /> Approve Cover & Continue to CTA
      </button>
    </div>
  );
}

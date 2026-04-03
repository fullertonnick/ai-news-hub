'use client';
import { useCallback } from 'react';
import { useCarouselStore } from '../../stores/useCarouselStore';
import { Loader2, RefreshCw, Check, SkipForward, ChevronDown, ChevronUp, Image } from 'lucide-react';
import { useState } from 'react';

export default function Step2Backgrounds() {
  const store = useCarouselStore();
  const { slides, topic, category, bgLoading } = store;
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);

  const generateAllBackgrounds = useCallback(async () => {
    for (const slide of slides) {
      if (slide.backgroundStatus === 'done') continue;
      await generateBackground(slide.id);
    }
  }, [slides, topic, category]);

  const generateBackground = useCallback(async (slideId: string) => {
    const slide = slides.find(s => s.id === slideId);
    if (!slide) return;

    store.setBgLoading(slideId, true);
    store.setSlideBackgroundStatus(slideId, 'generating');

    try {
      // Step 1: Generate topic-aware prompt if we don't have one
      let prompt = slide.backgroundPrompt || '';
      if (!prompt) {
        const r = await fetch('/api/carousel/generate-bg-prompt', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, slideText: slide.text, slideType: slide.visual_type, category }),
        });
        const d = await r.json();
        prompt = d.prompt || '';
        store.setSlideBackgroundPrompt(slideId, prompt);
      }

      // Step 2: Generate image with Imagen 3
      const r2 = await fetch('/api/imagen', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, negative_prompt: '' }),
      });
      const d2 = await r2.json();
      if (d2.dataUrl) {
        store.setSlideBackground(slideId, d2.dataUrl);
      } else {
        store.setSlideBackgroundStatus(slideId, 'error');
      }
    } catch {
      store.setSlideBackgroundStatus(slideId, 'error');
    }
    store.setBgLoading(slideId, false);
  }, [slides, topic, category, store]);

  const regenerateWithPrompt = useCallback(async (slideId: string) => {
    const slide = slides.find(s => s.id === slideId);
    if (!slide?.backgroundPrompt) return;

    store.setBgLoading(slideId, true);
    store.setSlideBackgroundStatus(slideId, 'generating');
    try {
      const r = await fetch('/api/imagen', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: slide.backgroundPrompt, negative_prompt: '' }),
      });
      const d = await r.json();
      if (d.dataUrl) store.setSlideBackground(slideId, d.dataUrl);
      else store.setSlideBackgroundStatus(slideId, 'error');
    } catch { store.setSlideBackgroundStatus(slideId, 'error'); }
    store.setBgLoading(slideId, false);
  }, [slides, store]);

  const allDone = slides.every(s => s.backgroundStatus === 'done' || s.backgroundStatus === 'skipped');

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Generate Backgrounds</h3>
          <p className="text-xs text-gray-500 mt-0.5">AI creates topic-aware background images for each slide. Edit prompts to customize.</p>
        </div>
        <button onClick={generateAllBackgrounds}
          className="flex items-center gap-1.5 bg-brand-orange hover:bg-orange-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
          <Image size={14} /> Generate All
        </button>
      </div>

      {/* Slide background cards */}
      <div className="space-y-3">
        {slides.map((slide, i) => {
          const loading = bgLoading[slide.id] || false;
          const expanded = expandedPrompt === slide.id;
          return (
            <div key={slide.id} className="rounded-xl bg-white/[0.03] border border-white/10 overflow-hidden">
              <div className="flex">
                {/* Text preview */}
                <div className="flex-1 p-4 border-r border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] text-gray-400 font-bold">{i + 1}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">{slide.visual_type.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed line-clamp-4">{slide.text}</p>
                </div>

                {/* Background preview */}
                <div className="w-40 flex-shrink-0 relative bg-black flex items-center justify-center">
                  {slide.backgroundImage ? (
                    <img src={slide.backgroundImage} alt="" className="w-full h-full object-cover" style={{ aspectRatio: '4/5' }} />
                  ) : loading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-brand-orange" />
                      <span className="text-[10px] text-gray-500">Generating...</span>
                    </div>
                  ) : slide.backgroundStatus === 'error' ? (
                    <span className="text-[10px] text-red-400">Failed</span>
                  ) : slide.backgroundStatus === 'skipped' ? (
                    <span className="text-[10px] text-gray-600">Skipped</span>
                  ) : (
                    <span className="text-[10px] text-gray-700">Pending</span>
                  )}
                </div>
              </div>

              {/* Actions + prompt editor */}
              <div className="border-t border-white/5 px-4 py-2 flex items-center gap-2">
                <button onClick={() => generateBackground(slide.id)} disabled={loading}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 disabled:opacity-40">
                  <RefreshCw size={11} /> {slide.backgroundImage ? 'Regenerate' : 'Generate'}
                </button>
                <button onClick={() => { store.setSlideBackgroundStatus(slide.id, 'skipped'); }}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                  <SkipForward size={11} /> Skip
                </button>
                <button onClick={() => setExpandedPrompt(expanded ? null : slide.id)}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 ml-auto">
                  {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />} Prompt
                </button>
              </div>

              {expanded && (
                <div className="border-t border-white/5 px-4 py-3">
                  <textarea value={slide.backgroundPrompt || ''} onChange={e => store.setSlideBackgroundPrompt(slide.id, e.target.value)}
                    placeholder="Imagen 3 prompt will appear here after generation..."
                    className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 leading-relaxed resize-none focus:outline-none focus:border-brand-orange/30 font-mono"
                    rows={4} />
                  <button onClick={() => regenerateWithPrompt(slide.id)} disabled={loading || !slide.backgroundPrompt}
                    className="mt-2 text-xs text-brand-orange hover:text-orange-400 flex items-center gap-1 disabled:opacity-40">
                    <RefreshCw size={11} /> Regenerate with edited prompt
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Approve */}
      <button onClick={() => { store.approve('backgrounds'); store.setStep(3); }}
        disabled={!allDone}
        className="w-full bg-green-500/20 hover:bg-green-500/30 disabled:opacity-30 border border-green-500/30 text-green-400 font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
        <Check size={14} /> Approve Backgrounds & Continue to Cover
      </button>
    </div>
  );
}

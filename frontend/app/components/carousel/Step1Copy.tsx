'use client';
import { useCallback } from 'react';
import { useCarouselStore } from '../../stores/useCarouselStore';
import { Loader2, Zap, RefreshCw, ArrowUp, ArrowDown, Trash2, Plus, Check } from 'lucide-react';

const VISUAL_TYPES = ['cover_photo', 'code_block', 'stats_grid', 'diagram', 'steps_list', 'skill_card', 'big_quote', 'comparison', 'checklist', 'cta_slide', 'none'];

export default function Step1Copy() {
  const store = useCarouselStore();
  const { topic, style, slides, caption, keyword, copyLoading, approvals } = store;

  const generateCopy = useCallback(async () => {
    if (!topic.trim()) return;
    store.setCopyLoading(true);
    try {
      const r = await fetch('/api/carousel/generate-copy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, style }),
      });
      const d = await r.json();
      if (d.slides?.length) {
        store.setSlides(d.slides);
        store.setCaption(d.caption || '');
        store.setKeyword(d.keyword || '');
        store.setCategory(d.category || '');
      }
    } catch (e) { console.error('Copy generation failed:', e); }
    store.setCopyLoading(false);
  }, [topic, style, store]);

  const regenerateSlide = useCallback(async (slideId: string) => {
    const slide = slides.find(s => s.id === slideId);
    if (!slide) return;
    store.setBgLoading(slideId, true);
    try {
      const idx = slides.findIndex(s => s.id === slideId);
      const r = await fetch('/api/carousel/regenerate-slide', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, slideIndex: idx, currentText: slide.text, style, category: store.category }),
      });
      const d = await r.json();
      if (d.text) {
        store.updateSlideText(slideId, d.text);
        if (d.accent_word) store.updateSlideAccent(slideId, d.accent_word);
      }
    } catch (e) { console.error('Slide regen failed:', e); }
    store.setBgLoading(slideId, false);
  }, [slides, topic, style, store]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Topic + style */}
      <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 space-y-3">
        <input type="text" value={topic} onChange={e => store.setTopic(e.target.value)}
          placeholder="Topic: e.g. Make.com automating client onboarding"
          className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-brand-orange/50" />
        <div className="flex gap-1.5">
          {['tech_breakdown', 'use_case_list', 'prompt_reveal'].map(s => (
            <button key={s} onClick={() => store.setStyle(s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${style === s ? 'border-brand-orange/40 bg-brand-orange/10 text-brand-orange' : 'border-white/10 text-gray-500 hover:text-white'}`}>
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <button onClick={generateCopy} disabled={copyLoading || !topic.trim()}
          className="w-full bg-brand-orange hover:bg-orange-500 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
          {copyLoading ? <><Loader2 size={14} className="animate-spin" />Generating Copy...</> : <><Zap size={14} />{slides.length ? 'Regenerate All Copy' : 'Generate Copy'}</>}
        </button>
      </div>

      {/* Slide cards */}
      {slides.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{slides.length} Slides — Edit Below</span>
            {keyword && <span className="text-xs font-bold text-brand-orange bg-brand-orange/10 px-2.5 py-0.5 rounded-full">Keyword: {keyword}</span>}
          </div>

          {slides.map((slide, i) => (
            <div key={slide.id} className="rounded-xl bg-white/[0.03] border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] text-gray-400 font-bold">{i + 1}</span>
                  <select value={slide.visual_type} onChange={e => store.updateSlideVisualType(slide.id, e.target.value)}
                    className="bg-transparent border border-white/10 rounded-lg px-2 py-1 text-[10px] text-gray-400 uppercase tracking-wider focus:outline-none focus:border-brand-orange/50">
                    {VISUAL_TYPES.map(vt => <option key={vt} value={vt} className="bg-black">{vt.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => store.reorderSlide(slide.id, 'up')} disabled={i === 0}
                    className="p-1 rounded hover:bg-white/5 text-gray-600 hover:text-white disabled:opacity-20"><ArrowUp size={12} /></button>
                  <button onClick={() => store.reorderSlide(slide.id, 'down')} disabled={i === slides.length - 1}
                    className="p-1 rounded hover:bg-white/5 text-gray-600 hover:text-white disabled:opacity-20"><ArrowDown size={12} /></button>
                  <button onClick={() => regenerateSlide(slide.id)}
                    className="p-1 rounded hover:bg-white/5 text-gray-600 hover:text-white"><RefreshCw size={12} /></button>
                  <button onClick={() => store.removeSlide(slide.id)} disabled={slides.length <= 2}
                    className="p-1 rounded hover:bg-red-500/10 text-gray-600 hover:text-red-400 disabled:opacity-20"><Trash2 size={12} /></button>
                </div>
              </div>

              {/* Editable text */}
              <textarea value={slide.text} onChange={e => store.updateSlideText(slide.id, e.target.value)}
                className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-200 leading-relaxed resize-none focus:outline-none focus:border-brand-orange/30"
                rows={Math.max(2, Math.ceil(slide.text.length / 80))} />

              {/* Accent word */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-600 uppercase tracking-wider">Accent:</span>
                <input type="text" value={slide.accent_word || ''} onChange={e => store.updateSlideAccent(slide.id, e.target.value)}
                  placeholder="word to highlight orange"
                  className="bg-transparent border-b border-white/10 text-xs text-brand-orange px-1 py-0.5 w-32 focus:outline-none focus:border-brand-orange" />
              </div>
            </div>
          ))}

          {/* Add slide */}
          <button onClick={() => store.addSlide(slides.length - 2)} // before CTA
            className="w-full border border-dashed border-white/10 rounded-xl py-2.5 text-xs text-gray-600 hover:text-white hover:border-white/20 transition-colors flex items-center justify-center gap-1.5">
            <Plus size={12} /> Add Slide
          </button>

          {/* Caption */}
          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4 space-y-2">
            <div className="text-xs font-bold text-gray-600 uppercase tracking-widest">Instagram Caption</div>
            <textarea value={caption} onChange={e => store.setCaption(e.target.value)}
              className="w-full bg-transparent border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 leading-relaxed resize-none focus:outline-none focus:border-brand-orange/30"
              rows={5} />
          </div>

          {/* Approve */}
          <button onClick={() => { store.approve('copy'); store.setStep(2); }}
            className="w-full bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
            <Check size={14} /> Approve Copy & Continue to Backgrounds
          </button>
        </div>
      )}
    </div>
  );
}

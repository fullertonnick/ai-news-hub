'use client';
import { useState, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Loader2, Zap, RefreshCw } from 'lucide-react';
import { toPng } from 'html-to-image';
import SlideRenderer from './SlideRenderer';
import { CarouselSlide, ResearchData } from '../types';

interface Props { topic: string; onClose: () => void; }

type Step = 'research' | 'generate' | 'preview';

export default function CarouselGenerator({ topic, onClose }: Props) {
  const [step, setStep] = useState<Step>('research');
  const [research, setResearch] = useState<ResearchData | null>(null);
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [angle, setAngle] = useState<string>('');
  const [style, setStyle] = useState('tech_breakdown');
  const [downloading, setDownloading] = useState(false);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);

  const doResearch = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic }) });
      const d = await r.json();
      setResearch(d); setAngle(d.unique_angles?.[0]?.angle || '');
      setStep('generate');
    } catch { setError('Research failed. Try again.'); }
    setLoading(false);
  }, [topic]);

  const doGenerate = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/carousel/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, style, custom_angle: angle }) });
      const d = await r.json();
      if (!d.slides?.length) throw new Error('No slides');
      setSlides(d.slides); setCurrentSlide(0); setStep('preview');
    } catch { setError('Generation failed. Try again.'); }
    setLoading(false);
  }, [topic, style, angle]);

  const downloadAll = useCallback(async () => {
    setDownloading(true);
    for (let i = 0; i < slides.length; i++) {
      const el = exportRefs.current[i];
      if (!el) continue;
      try {
        const png = await toPng(el, { pixelRatio: 1, cacheBust: true });
        const a = document.createElement('a');
        a.href = png; a.download = `slide-${i + 1}.png`; a.click();
        await new Promise(r => setTimeout(r, 300));
      } catch { console.error('Export error slide', i); }
    }
    setDownloading(false);
  }, [slides]);

  const downloadCurrent = useCallback(async () => {
    const el = exportRefs.current[currentSlide];
    if (!el) return;
    setDownloading(true);
    try {
      const png = await toPng(el, { pixelRatio: 1, cacheBust: true });
      const a = document.createElement('a'); a.href = png; a.download = `slide-${currentSlide + 1}.png`; a.click();
    } catch { console.error('Export error'); }
    setDownloading(false);
  }, [currentSlide]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-3xl bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">Carousel Generator</h2>
            <p className="text-gray-500 text-sm mt-0.5 truncate max-w-md">{topic}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5 flex-shrink-0">
          {(['research', 'generate', 'preview'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition-all ${step === s ? 'bg-brand-orange/20 text-brand-orange border border-brand-orange/30' : ['research','generate','preview'].indexOf(step) > i ? 'text-gray-500 bg-white/5' : 'text-gray-700 bg-white/[0.02]'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${step === s ? 'bg-brand-orange text-white' : ['research','generate','preview'].indexOf(step) > i ? 'bg-white/20 text-gray-400' : 'bg-white/5 text-gray-700'}`}>{i+1}</span>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </div>
              {i < 2 && <div className="w-6 h-px bg-white/10" />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Research step */}
          {step === 'research' && (
            <div className="p-6 space-y-4">
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5">
                <h3 className="text-white font-semibold mb-2">AI Research</h3>
                <p className="text-gray-400 text-sm leading-relaxed">We'll research <span className="text-brand-orange font-medium">"{topic}"</span> to find unique angles, business applications, and viral hooks — so your carousel stands out.</p>
              </div>
              {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>}
              <button onClick={doResearch} disabled={loading} className="w-full bg-brand-orange hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                {loading ? <><Loader2 size={16} className="animate-spin" />Researching...</> : <><Zap size={16} />Start Research</>}
              </button>
            </div>
          )}

          {/* Generate step */}
          {step === 'generate' && research && (
            <div className="p-6 space-y-4">
              {/* Angles */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Choose Your Angle</label>
                <div className="space-y-2">
                  {(research.unique_angles || []).map((a, i) => (
                    <button key={i} onClick={() => setAngle(a.angle)} className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${angle === a.angle ? 'border-brand-orange/50 bg-brand-orange/10 text-white' : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/20'}`}>{a.angle}</button>
                  ))}
                </div>
              </div>
              {/* Style */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Carousel Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {[['tech_breakdown','Tech Breakdown'],['use_case_list','Use Cases'],['prompt_reveal','Prompt Reveal']].map(([v, l]) => (
                    <button key={v} onClick={() => setStyle(v)} className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${style === v ? 'border-brand-orange/50 bg-brand-orange/10 text-brand-orange' : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-white/20'}`}>{l}</button>
                  ))}
                </div>
              </div>
              {/* Hooks preview */}
              {research.hook_options?.length > 0 && (
                <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Hook Options</div>
                  <div className="space-y-1.5">
                    {research.hook_options.slice(0,3).map((h, i) => (
                      <div key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-brand-orange font-bold flex-shrink-0">{i+1}.</span>{h}</div>
                    ))}
                  </div>
                </div>
              )}
              {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>}
              <button onClick={doGenerate} disabled={loading} className="w-full bg-brand-orange hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                {loading ? <><Loader2 size={16} className="animate-spin" />Generating Slides...</> : <><Zap size={16} />Generate Carousel</>}
              </button>
            </div>
          )}

          {/* Preview step */}
          {step === 'preview' && slides.length > 0 && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-400">{currentSlide + 1} / {slides.length}</span>
                <div className="flex gap-2">
                  <button onClick={() => { setStep('generate'); }} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-colors"><RefreshCw size={12} />Regenerate</button>
                  <button onClick={downloadCurrent} disabled={downloading} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-colors"><Download size={12} />This Slide</button>
                  <button onClick={downloadAll} disabled={downloading} className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg bg-brand-orange/20 border border-brand-orange/30 hover:bg-brand-orange/30 transition-colors">
                    {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}All Slides
                  </button>
                </div>
              </div>

              {/* Main slide preview */}
              <div className="flex justify-center mb-4">
                <div style={{ transform: 'scale(0.5)', transformOrigin: 'top center', height: '337px', width: '540px', marginBottom: '-337px' }}>
                  <SlideRenderer
                    ref={el => { slideRefs.current[currentSlide] = el; }}
                    slide={slides[currentSlide]}
                    slideNumber={currentSlide + 1}
                    totalSlides={slides.length}
                  />
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-center gap-4 mb-4">
                <button onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))} disabled={currentSlide === 0} className="p-2 rounded-xl border border-white/10 hover:border-white/20 text-gray-400 hover:text-white disabled:opacity-30 transition-all"><ChevronLeft size={18} /></button>
                <div className="flex gap-1.5">
                  {slides.map((_, i) => <button key={i} onClick={() => setCurrentSlide(i)} className={`rounded-full transition-all ${i === currentSlide ? 'w-6 h-2 bg-brand-orange' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`} />)}
                </div>
                <button onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))} disabled={currentSlide === slides.length - 1} className="p-2 rounded-xl border border-white/10 hover:border-white/20 text-gray-400 hover:text-white disabled:opacity-30 transition-all"><ChevronRight size={18} /></button>
              </div>

              {/* Slide text preview */}
              <div className="bg-white/[0.02] rounded-xl border border-white/5 px-4 py-3">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Slide {currentSlide + 1} Text</div>
                <div className="text-gray-300 text-sm leading-relaxed">{slides[currentSlide]?.text}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden full-resolution export renders */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none' }}>
        {slides.map((slide, i) => (
          <SlideRenderer
            key={i}
            ref={el => { exportRefs.current[i] = el; }}
            slide={slide}
            slideNumber={i + 1}
            totalSlides={slides.length}
            forExport={true}
          />
        ))}
      </div>
    </div>
  );
}

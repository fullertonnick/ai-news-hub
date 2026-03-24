'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Loader2, Zap, RefreshCw, Copy, Check, Package } from 'lucide-react';
import { toPng } from 'html-to-image';
import SlideRenderer from './SlideRenderer';
import { CarouselSlide, ResearchData, QualityReport } from '../types';
import { Brand } from '../brand/simpliscale';

interface Props { topic: string; onClose: () => void; }
type Step = 'research' | 'generate' | 'preview';

function buildCarouselBrief(topic: string, style: string, keyword: string, slides: CarouselSlide[], caption: string, qr: QualityReport | null): string {
  const lines: string[] = [
    `# CAROUSEL_BRIEF — ${topic}`,
    '',
    `**Format**: ${style}`,
    `**Keyword**: ${keyword}`,
    `**Total Slides**: ${slides.length}`,
    `**Generated**: ${new Date().toISOString()}`,
    '',
    '## Slides',
    ...slides.map((s, i) => `${i + 1}. [${s.visual?.type || 'content'}] — "${s.text}"`),
    '',
    '## Instagram Caption',
    caption || '(no caption generated)',
    '',
  ];
  if (qr) {
    lines.push('## Quality Report');
    lines.push(`Passed: ${qr.passed ? 'yes' : 'no'}`);
    if (qr.issues?.length) lines.push(`Issues: ${qr.issues.join('; ')}`);
    if (qr.warnings?.length) lines.push(`Warnings: ${qr.warnings.join('; ')}`);
  }
  return lines.join('\n');
}

export default function CarouselGenerator({ topic, onClose }: Props) {
  const [step, setStep] = useState<Step>('research');
  const [research, setResearch] = useState<ResearchData | null>(null);
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [angle, setAngle] = useState('');
  const [style, setStyle] = useState('tech_breakdown');
  const [downloading, setDownloading] = useState<number | 'all' | 'zip' | null>(null);
  const [caption, setCaption] = useState('');
  const [keyword, setKeyword] = useState('');
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [captionCopied, setCaptionCopied] = useState(false);
  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Keyboard navigation
  useEffect(() => {
    if (step !== 'preview') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setCurrentSlide(s => Math.max(0, s - 1));
      if (e.key === 'ArrowRight') setCurrentSlide(s => Math.min(slides.length - 1, s + 1));
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [step, slides.length, onClose]);

  const doResearch = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic }) });
      const d = await r.json();
      setResearch(d);
      setAngle(d.unique_angles?.[0]?.angle || '');
      setStep('generate');
    } catch { setError('Research failed. Try again.'); }
    setLoading(false);
  }, [topic]);

  const doGenerate = useCallback(async () => {
    setLoading(true); setError('');
    try {
      // Fix A: forward full research context so generate API can produce dynamic content
      const r = await fetch('/api/carousel/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, style, custom_angle: angle, research_context: research }) });
      const d = await r.json();
      if (!d.slides?.length) throw new Error('No slides');
      setSlides(d.slides);
      setCaption(d.caption || '');
      setKeyword(d.keyword || '');
      setQualityReport(d.quality_report || null);
      setCurrentSlide(0);
      setStep('preview');
    } catch { setError('Generation failed. Try again.'); }
    setLoading(false);
  }, [topic, style, angle]);

  const downloadSlide = useCallback(async (i: number) => {
    const el = exportRefs.current[i];
    if (!el) return;
    setDownloading(i);
    try {
      const png = await toPng(el, { pixelRatio: 1, cacheBust: true });
      const a = document.createElement('a'); a.href = png; a.download = `nick-carousel-slide-${i + 1}.png`; a.click();
    } catch { console.error('Export error slide', i); }
    setDownloading(null);
  }, []);

  const downloadAll = useCallback(async () => {
    setDownloading('all');
    for (let i = 0; i < slides.length; i++) {
      await downloadSlide(i);
      await new Promise(r => setTimeout(r, 400));
    }
    setDownloading(null);
  }, [slides.length, downloadSlide]);

  const downloadZip = useCallback(async () => {
    setDownloading('zip');
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Capture all slide PNGs
      for (let i = 0; i < slides.length; i++) {
        const el = exportRefs.current[i];
        if (el) {
          const png = await toPng(el, { pixelRatio: 1, cacheBust: true });
          const base64 = png.replace(/^data:image\/png;base64,/, '');
          const slideType = slides[i].visual?.type || 'content';
          zip.file(`slides/slide-${String(i + 1).padStart(2, '0')}-${slideType}.png`, base64, { base64: true });
        }
        await new Promise(r => setTimeout(r, 200));
      }

      // Individual slide JSONs
      slides.forEach((slide, i) => {
        const slideType = slide.visual?.type || 'content';
        zip.file(`slides/slide-${String(i + 1).padStart(2, '0')}-${slideType}.json`, JSON.stringify(slide, null, 2));
      });

      // instagram-caption.txt
      zip.file('instagram-caption.txt', caption || '(no caption)');

      // CAROUSEL_BRIEF.md
      const brief = buildCarouselBrief(topic, style, keyword, slides, caption, qualityReport);
      zip.file('CAROUSEL_BRIEF.md', brief);

      // design-specs.json
      const specs = {
        brand: Brand.brand,
        colors: Brand.colors,
        typography: {
          font_family: Brand.typography.font_family,
          mono_font: Brand.typography.mono_font,
          weights: Brand.typography.weights,
        },
        canvas: Brand.canvas,
        templates: Brand.templates,
        generated_at: new Date().toISOString(),
      };
      zip.file('design-specs.json', JSON.stringify(specs, null, 2));

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carousel-${topic.replace(/\s+/g, '-').toLowerCase().slice(0, 40)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP error', err);
    }
    setDownloading(null);
  }, [slides, caption, keyword, topic, style, qualityReport]);

  const copyCaption = useCallback(() => {
    navigator.clipboard.writeText(caption).then(() => {
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 2000);
    });
  }, [caption]);

  const stepIndex = ['research', 'generate', 'preview'].indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-4xl bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl" style={{ maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-white font-bold text-lg">Carousel Generator</h2>
            <p className="text-gray-500 text-sm truncate">{topic}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-gray-500 hover:text-white transition-colors ml-4"><X size={20} /></button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5 flex-shrink-0">
          {(['Research', 'Configure', 'Preview'] as const).map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${i === stepIndex ? 'bg-brand-orange/20 text-brand-orange border border-brand-orange/30' : i < stepIndex ? 'text-gray-500 bg-white/5 border border-transparent' : 'text-gray-700 bg-transparent border border-transparent'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${i === stepIndex ? 'bg-brand-orange text-white' : i < stepIndex ? 'bg-white/20 text-gray-400' : 'bg-white/5 text-gray-700'}`}>{i + 1}</span>
                {label}
              </div>
              {i < 2 && <div className="w-5 h-px bg-white/10" />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── STEP 1: Research ── */}
          {step === 'research' && (
            <div className="p-6 space-y-4">
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2"><Zap size={16} className="text-brand-orange" />AI Research</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  We'll deep-research <span className="text-brand-orange font-medium">"{topic}"</span> — finding the real numbers, unique angles, and business applications that most content misses.
                </p>
              </div>
              {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>}
              <button onClick={doResearch} disabled={loading} className="w-full bg-brand-orange hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={16} className="animate-spin" />Researching...</> : <><Zap size={16} />Start Deep Research</>}
              </button>
            </div>
          )}

          {/* ── STEP 2: Configure ── */}
          {step === 'generate' && research && (
            <div className="p-6 space-y-5">
              {/* Angles */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-3">Choose Your Angle</label>
                <div className="space-y-2">
                  {(research.unique_angles || []).map((a, i) => (
                    <button key={i} onClick={() => setAngle(a.angle)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${angle === a.angle ? 'border-brand-orange/50 bg-brand-orange/10' : 'border-white/10 bg-white/[0.02] hover:border-white/20'}`}>
                      <div className={`font-semibold text-sm mb-1 ${angle === a.angle ? 'text-brand-orange' : 'text-white'}`}>{a.angle}</div>
                      <div className="text-gray-500 text-xs leading-relaxed">{a.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Style picker */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-3">Carousel Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {[['tech_breakdown', 'Tech Breakdown', 'Explain + implement'], ['use_case_list', 'Use Cases', 'Before/after results'], ['prompt_reveal', 'Prompt Reveal', 'Exact prompts to copy']].map(([v, l, d]) => (
                    <button key={v} onClick={() => setStyle(v)}
                      className={`px-3 py-3 rounded-xl border text-left transition-all ${style === v ? 'border-brand-orange/50 bg-brand-orange/10' : 'border-white/10 bg-white/[0.02] hover:border-white/20'}`}>
                      <div className={`text-sm font-semibold ${style === v ? 'text-brand-orange' : 'text-white'}`}>{l}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{d}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hook preview */}
              {research.hook_options?.length > 0 && (
                <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Opening Hook Options</div>
                  {research.hook_options.slice(0, 3).map((h, i) => (
                    <div key={i} className="text-sm text-gray-300 flex gap-2 mb-2 last:mb-0"><span className="text-brand-orange font-bold flex-shrink-0">{i + 1}.</span>{h}</div>
                  ))}
                </div>
              )}

              {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>}
              <button onClick={doGenerate} disabled={loading} className="w-full bg-brand-orange hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={16} className="animate-spin" />Generating Slides...</> : <><Zap size={16} />Generate Carousel</>}
              </button>
            </div>
          )}

          {/* ── STEP 3: Preview ── */}
          {step === 'preview' && slides.length > 0 && (
            <div className="flex flex-col">
              {/* Action bar */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white">{currentSlide + 1} <span className="text-gray-600">/ {slides.length}</span></span>
                  {/* Dot nav */}
                  <div className="flex gap-1.5">
                    {slides.map((_, i) => (
                      <button key={i} onClick={() => setCurrentSlide(i)}
                        className={`rounded-full transition-all ${i === currentSlide ? 'w-5 h-2 bg-brand-orange' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <button onClick={() => setStep('generate')} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
                    <RefreshCw size={12} />Regenerate
                  </button>
                  <button onClick={() => downloadSlide(currentSlide)} disabled={downloading !== null} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
                    {downloading === currentSlide ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}This Slide
                  </button>
                  <button onClick={downloadAll} disabled={downloading !== null} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
                    {downloading === 'all' ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}All {slides.length} Slides
                  </button>
                  <button onClick={downloadZip} disabled={downloading !== null} className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg bg-brand-orange/20 border border-brand-orange/30 hover:bg-brand-orange/30 transition-colors">
                    {downloading === 'zip' ? <Loader2 size={12} className="animate-spin" /> : <Package size={12} />}
                    {downloading === 'zip' ? 'Packaging...' : 'Download ZIP'}
                  </button>
                </div>
              </div>

              {/* Slide viewer */}
              <div className="flex" style={{ height: 'min(500px, 55vh)' }}>
                {/* Prev button */}
                <button onClick={() => setCurrentSlide(s => Math.max(0, s - 1))} disabled={currentSlide === 0}
                  className="flex-shrink-0 w-12 flex items-center justify-center text-gray-600 hover:text-white disabled:opacity-20 transition-colors">
                  <ChevronLeft size={24} />
                </button>

                {/* Slide display */}
                <div className="flex-1 flex items-center justify-center py-4 min-w-0 overflow-hidden">
                  <div style={{ width: '100%', maxWidth: '360px', aspectRatio: '4/5', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '12px' }}>
                      <div style={{ transform: 'scale(var(--slide-scale, 1))', transformOrigin: 'top center' }}
                        ref={el => {
                          if (el) {
                            const containerW = el.parentElement?.parentElement?.offsetWidth || 360;
                            el.style.setProperty('--slide-scale', String(Math.min(containerW / 540, 1)));
                          }
                        }}>
                        <SlideRenderer slide={slides[currentSlide]} slideNumber={currentSlide + 1} totalSlides={slides.length} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Next button */}
                <button onClick={() => setCurrentSlide(s => Math.min(slides.length - 1, s + 1))} disabled={currentSlide === slides.length - 1}
                  className="flex-shrink-0 w-12 flex items-center justify-center text-gray-600 hover:text-white disabled:opacity-20 transition-colors">
                  <ChevronRight size={24} />
                </button>
              </div>

              {/* Slide text strip */}
              <div className="px-6 py-3 border-t border-white/5 flex-shrink-0">
                <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Slide {currentSlide + 1} Copy</div>
                <div className="text-gray-300 text-sm leading-relaxed">{slides[currentSlide]?.text}</div>
              </div>

              {/* Instagram caption */}
              {caption && (
                <div className="px-6 py-4 border-t border-white/5 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Instagram Caption</div>
                    <button onClick={copyCaption} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2.5 py-1 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
                      {captionCopied ? <><Check size={11} className="text-green-400" /><span className="text-green-400">Copied!</span></> : <><Copy size={11} />Copy</>}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={caption}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-gray-300 text-xs leading-relaxed resize-none focus:outline-none"
                    rows={5}
                    onClick={e => (e.target as HTMLTextAreaElement).select()}
                  />
                  {keyword && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-600">Keyword:</span>
                      <span className="text-xs font-bold text-brand-orange bg-brand-orange/10 border border-brand-orange/20 px-2.5 py-0.5 rounded-full">{keyword}</span>
                    </div>
                  )}
                  {qualityReport && !qualityReport.passed && (
                    <div className="mt-2 text-xs text-yellow-500/80 bg-yellow-500/5 border border-yellow-500/15 rounded-lg px-3 py-2">
                      {qualityReport.issues.map((issue, i) => <div key={i}>⚠ {issue}</div>)}
                      {qualityReport.warnings.map((w, i) => <div key={i} className="text-yellow-600/60">• {w}</div>)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden full-res export renders */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none', opacity: 0 }}>
        {slides.map((slide, i) => (
          <SlideRenderer key={i} ref={el => { exportRefs.current[i] = el; }} slide={slide} slideNumber={i + 1} totalSlides={slides.length} forExport />
        ))}
      </div>
    </div>
  );
}

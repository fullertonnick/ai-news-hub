'use client';
import { useRef, useCallback, useState } from 'react';
import { useCarouselStore } from '../../stores/useCarouselStore';
import { Download, Package, Copy, Check, Loader2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import SlideRenderer from '../SlideRenderer';
import { toPng } from 'html-to-image';
import type { CarouselSlide } from '../../types';
import { Brand } from '../../brand/simpliscale';

export default function Step6Export() {
  const store = useCarouselStore();
  const { slides, keyword, ctaLayout, caption } = store;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [downloading, setDownloading] = useState<number | 'all' | 'zip' | null>(null);
  const [captionCopied, setCaptionCopied] = useState(false);
  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Build render slides
  const renderSlides: CarouselSlide[] = slides.map((s, i) => {
    const isFirst = i === 0, isLast = i === slides.length - 1;
    let visual: any;
    if (isFirst) visual = { type: 'cover_photo', gradient_hue: 25 };
    else if (isLast) visual = { type: 'cta_slide', keyword, layout_variant: ctaLayout };
    else visual = s.visual || { type: s.visual_type || 'none' };
    return { text: s.text, accent_word: s.accent_word, section_label: s.section_label, visual, backgroundImage: s.backgroundImage };
  });

  const downloadSlide = useCallback(async (i: number) => {
    const el = exportRefs.current[i];
    if (!el) return;
    setDownloading(i);
    try {
      const png = await toPng(el, { pixelRatio: 1, cacheBust: true });
      const a = document.createElement('a'); a.href = png; a.download = `carousel-slide-${i + 1}.png`; a.click();
    } catch (e) { console.error('Export error', e); }
    setDownloading(null);
  }, []);

  const downloadZip = useCallback(async () => {
    setDownloading('zip');
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (let i = 0; i < slides.length; i++) {
        const el = exportRefs.current[i];
        if (el) {
          const png = await toPng(el, { pixelRatio: 1, cacheBust: true });
          zip.file(`slide-${String(i + 1).padStart(2, '0')}.png`, png.replace(/^data:image\/png;base64,/, ''), { base64: true });
        }
        await new Promise(r => setTimeout(r, 200));
      }
      zip.file('instagram-caption.txt', caption || '(no caption)');
      zip.file('carousel-data.json', JSON.stringify({ topic: store.topic, keyword, slides: slides.map(s => ({ text: s.text, visual_type: s.visual_type })), caption }, null, 2));
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `carousel-${store.topic.replace(/\s+/g, '-').toLowerCase().slice(0, 40)}.zip`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error('ZIP error', e); }
    setDownloading(null);
  }, [slides, caption, keyword, store.topic]);

  const copyCaption = () => {
    navigator.clipboard.writeText(caption);
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Export Carousel</h3>
          <p className="text-xs text-gray-500 mt-0.5">{slides.length} slides ready. Download individually or as a ZIP package.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadSlide(currentIdx)} disabled={downloading !== null}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-colors disabled:opacity-40">
            {downloading === currentIdx ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} This Slide
          </button>
          <button onClick={downloadZip} disabled={downloading !== null}
            className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg bg-brand-orange/20 border border-brand-orange/30 hover:bg-brand-orange/30 transition-colors disabled:opacity-40">
            {downloading === 'zip' ? <Loader2 size={12} className="animate-spin" /> : <Package size={12} />}
            {downloading === 'zip' ? 'Packaging...' : 'Download ZIP'}
          </button>
        </div>
      </div>

      {/* Slide viewer */}
      <div className="flex items-center gap-4">
        <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}
          className="p-2 rounded-xl hover:bg-white/5 text-gray-600 hover:text-white disabled:opacity-20"><ChevronLeft size={20} /></button>
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
          className="p-2 rounded-xl hover:bg-white/5 text-gray-600 hover:text-white disabled:opacity-20"><ChevronRight size={20} /></button>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setCurrentIdx(i)}
            className={`rounded-full transition-all ${i === currentIdx ? 'w-5 h-2 bg-brand-orange' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`} />
        ))}
      </div>

      {/* Caption */}
      {caption && (
        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Instagram Caption</span>
            <button onClick={copyCaption} className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5">
              {captionCopied ? <><Check size={11} className="text-green-400" /><span className="text-green-400">Copied!</span></> : <><Copy size={11} />Copy</>}
            </button>
          </div>
          <textarea value={caption} readOnly onClick={e => (e.target as HTMLTextAreaElement).select()}
            className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 leading-relaxed resize-none focus:outline-none" rows={5} />
          {keyword && <div className="flex items-center gap-2"><span className="text-xs text-gray-600">Keyword:</span><span className="text-xs font-bold text-brand-orange bg-brand-orange/10 px-2.5 py-0.5 rounded-full">{keyword}</span></div>}
        </div>
      )}

      {/* New carousel */}
      <button onClick={store.reset}
        className="w-full border border-white/10 hover:border-white/20 text-gray-400 hover:text-white py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
        <RotateCcw size={14} /> Start New Carousel
      </button>

      {/* Hidden export renders — off-screen so they don't flash, no opacity:0 so html-to-image captures content correctly */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none' }}>
        {renderSlides.map((slide, i) => (
          <SlideRenderer key={i} ref={el => { exportRefs.current[i] = el; }} slide={slide} slideNumber={i + 1} totalSlides={slides.length} forExport />
        ))}
      </div>
    </div>
  );
}

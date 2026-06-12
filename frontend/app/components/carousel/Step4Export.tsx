'use client';
import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useCarouselStore } from '../../stores/useCarouselStore';
import { Download, Package, Copy, Check, Loader2, ChevronLeft, ChevronRight, RotateCcw, AlertCircle } from 'lucide-react';
import SlideRenderer from '../SlideRenderer';
import { toPng } from 'html-to-image';
import { toDataUrl } from '../../lib/imageProxy';
import type { CarouselSlide } from '../../types';

// Font preloading — called before every PNG export so custom fonts render correctly.
// Lives outside the component so it isn't recreated on each render.
//
// Next.js self-hosts fonts under internal names (e.g. __Plus_Jakarta_Sans_3c98db)
// not the original names. We read the CSS variables at runtime to get the actual
// font-family string used in @font-face, then pass that to document.fonts.load().
async function preloadFonts() {
    await document.fonts.ready;
    const s = getComputedStyle(document.documentElement);
    const pjs     = s.getPropertyValue('--font-plus-jakarta-sans').trim().split(',')[0].trim()    || '"Plus Jakarta Sans"';
    const mono    = s.getPropertyValue('--font-jetbrains-mono').trim().split(',')[0].trim()       || '"JetBrains Mono"';
    const caveat  = s.getPropertyValue('--font-caveat').trim().split(',')[0].trim()               || 'Caveat';
    const archivo = s.getPropertyValue('--font-archivo-black').trim().split(',')[0].trim()        || '"Archivo Black"';
    const interF  = s.getPropertyValue('--font-inter').trim().split(',')[0].trim()                || 'Inter';
    const dmSans  = s.getPropertyValue('--font-dm-sans').trim().split(',')[0].trim()              || '"DM Sans"';
    const playfair = s.getPropertyValue('--font-playfair-display').trim().split(',')[0].trim()    || '"Playfair Display"';
    await Promise.allSettled([
      // ── Plus Jakarta Sans 800 (ExtraBold) ──────────────────────────────────────
      // Cover headline: 56–96px adaptive; CTA text-only: 36–60px; content headline: 36–56px;
      // kicker: 28px; CTA keyword pill: 26–28px; badge/step circle: 20px; stats value: 64px
      document.fonts.load(`800 96px ${pjs}`),
      document.fonts.load(`800 86px ${pjs}`),
      document.fonts.load(`800 76px ${pjs}`),
      document.fonts.load(`800 66px ${pjs}`),
      document.fonts.load(`800 64px ${pjs}`),
      document.fonts.load(`800 60px ${pjs}`),
      document.fonts.load(`800 56px ${pjs}`),
      document.fonts.load(`800 54px ${pjs}`),
      document.fonts.load(`800 52px ${pjs}`),
      document.fonts.load(`800 50px ${pjs}`),
      document.fonts.load(`800 48px ${pjs}`),
      document.fonts.load(`800 62px ${pjs}`),
      document.fonts.load(`800 58px ${pjs}`),
      document.fonts.load(`800 46px ${pjs}`),
      document.fonts.load(`800 44px ${pjs}`),
      document.fonts.load(`800 42px ${pjs}`),
      document.fonts.load(`800 38px ${pjs}`),
      document.fonts.load(`800 36px ${pjs}`),
      document.fonts.load(`800 32px ${pjs}`),
      document.fonts.load(`800 30px ${pjs}`),
      document.fonts.load(`800 28px ${pjs}`),
      document.fonts.load(`800 26px ${pjs}`),
      document.fonts.load(`800 20px ${pjs}`),
      // ── Plus Jakarta Sans 700 (Bold) ────────────────────────────────────────────
      // Steps title / skill name: 22px; comparison headers + diagram nodes: 18px;
      // skill card bg label: 16px; code instruction arrow: 13px
      document.fonts.load(`700 22px ${pjs}`),
      document.fonts.load(`700 18px ${pjs}`),
      document.fonts.load(`700 16px ${pjs}`),
      document.fonts.load(`700 13px ${pjs}`),
      // ── Plus Jakarta Sans 600 (SemiBold) ───────────────────────────────────────
      // Footer handle: 20px; slide count: 18px; section label: 16px; stats label: 17px;
      // CTA "Comment…" text: 24–26px; diagram title: 13px; skill category: 13px
      document.fonts.load(`600 26px ${pjs}`),
      document.fonts.load(`600 24px ${pjs}`),
      document.fonts.load(`600 20px ${pjs}`),
      document.fonts.load(`600 18px ${pjs}`),
      document.fonts.load(`600 17px ${pjs}`),
      document.fonts.load(`600 16px ${pjs}`),
      document.fonts.load(`600 13px ${pjs}`),
      // ── Plus Jakarta Sans 500 (Medium) ─────────────────────────────────────────
      // Footer save CTA: 20px; cover subtitle: 24px; code instruction label: 13px
      document.fonts.load(`500 24px ${pjs}`),
      document.fonts.load(`500 20px ${pjs}`),
      document.fonts.load(`500 13px ${pjs}`),
      document.fonts.load(`500 12px ${pjs}`),
      document.fonts.load(`italic 500 13px ${pjs}`),
      // ── Plus Jakarta Sans 400 (Regular) ────────────────────────────────────────
      // Body text: 24px; checklist items: 22px; steps desc: 20px;
      // comparison items/skill desc: 19px; comparison sub-text: 17–18px; skill source: 16px
      document.fonts.load(`400 24px ${pjs}`),
      document.fonts.load(`400 22px ${pjs}`),
      document.fonts.load(`400 20px ${pjs}`),
      document.fonts.load(`400 19px ${pjs}`),
      document.fonts.load(`400 18px ${pjs}`),
      document.fonts.load(`400 17px ${pjs}`),
      document.fonts.load(`400 16px ${pjs}`),
      // ── Italic variants (big_quote slides use 54/46/38px 800 italic) ───────────
      document.fonts.load(`italic 800 54px ${pjs}`),
      document.fonts.load(`italic 800 46px ${pjs}`),
      document.fonts.load(`italic 800 38px ${pjs}`),
      document.fonts.load(`italic 400 24px ${pjs}`),
      // ── JetBrains Mono (code blocks) ───────────────────────────────────────────
      document.fonts.load(`400 20px ${mono}`),
      document.fonts.load(`500 20px ${mono}`),
      document.fonts.load(`400 15px ${mono}`),
      // ── Text overlay fonts ──────────────────────────────────────────────────────
      document.fonts.load(`400 40px ${caveat}`),
      document.fonts.load(`700 40px ${caveat}`),
      document.fonts.load(`400 40px ${archivo}`),
      document.fonts.load(`400 40px ${interF}`),
      document.fonts.load(`600 40px ${interF}`),
      document.fonts.load(`700 40px ${interF}`),
      document.fonts.load(`400 40px ${dmSans}`),
      document.fonts.load(`700 40px ${dmSans}`),
      document.fonts.load(`400 40px ${playfair}`),
      document.fonts.load(`700 40px ${playfair}`),
      document.fonts.load(`italic 400 40px ${playfair}`),
      document.fonts.load(`italic 700 40px ${playfair}`),
    ]);
}

// Waits for every <img> inside the export element to fully decode before capture.
// html-to-image reads pixel data synchronously — images that haven't decoded yet
// appear blank even if their src is a valid data: URL.
async function waitForImages(el: HTMLElement) {
  const imgs = [...el.querySelectorAll('img')] as HTMLImageElement[];
  await Promise.all(
    imgs.map(img =>
      img.complete
        ? (img.decode ? img.decode().catch(() => {}) : Promise.resolve())
        : new Promise<void>(resolve => {
            img.onload  = () => resolve();
            img.onerror = () => resolve();
          })
    )
  );
}

export default function Step4Export() {
  const store = useCarouselStore();
  const { slides, keyword, ctaLayout, caption, coverPosition } = store;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [downloading, setDownloading] = useState<number | 'zip' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [captionCopied, setCaptionCopied] = useState(false);
  const captionCopiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (captionCopiedTimer.current) clearTimeout(captionCopiedTimer.current); }, []);
  const [previewScale, setPreviewScale] = useState(0);
  const [proxyingImages, setProxyingImages] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Clamp currentIdx when slides shrink (e.g. user navigates back and regenerates with fewer slides).
  // safeIdx is derived synchronously on every render so SlideRenderer never receives an undefined slide.
  const safeIdx = slides.length > 0 ? Math.min(currentIdx, slides.length - 1) : 0;
  useEffect(() => {
    if (safeIdx !== currentIdx) setCurrentIdx(safeIdx);
  }, [safeIdx, currentIdx]);

  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.offsetWidth || 400;
      setPreviewScale(Math.min(w / 540, 1));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Stable reference to the store action — won't cause ensureDataUrls to be recreated on every state change
  const setSlideBackground = useCarouselStore(s => s.setSlideBackground);

  // Safety net: proxy any non-data-URL backgrounds before first export
  const ensureDataUrls = useCallback(async () => {
    const external = slides.filter(s => s.backgroundImage && !s.backgroundImage.startsWith('data:'));
    if (!external.length) return;
    setProxyingImages(true);
    await Promise.all(external.map(async s => {
      try {
        const dataUrl = await toDataUrl(s.backgroundImage!);
        if (dataUrl.startsWith('data:')) setSlideBackground(s.id, dataUrl);
      } catch { /* leave as-is */ }
    }));
    // Wait for React to flush store updates and CSS background-image to decode
    await new Promise(r => setTimeout(r, 800));
    setProxyingImages(false);
  }, [slides, setSlideBackground]);

  // Build render slides — memoized so hidden 1080px renderers don't re-render on every UI state change
  const renderSlides: CarouselSlide[] = useMemo(() => slides.map((s, i) => {
    const isFirst = i === 0, isLast = i === slides.length - 1;
    let visual: any;
    if (isFirst) visual = { type: 'cover_photo', gradient_hue: 25, position: coverPosition };
    else if (isLast) visual = { type: 'cta_slide', keyword, layout_variant: ctaLayout };
    else visual = s.visual || { type: s.visual_type || 'none' };
    return {
      id: s.id,
      text: s.text, accent_word: s.accent_word, section_label: s.section_label,
      visual, backgroundImage: s.backgroundImage,
      stickers: s.stickers, textOverlays: s.textOverlays,
      useTextOverlays: s.useTextOverlays,
      textOffsetX: s.useTextOverlays ? 0 : s.textOffsetX,
      textOffsetY: s.useTextOverlays ? 0 : s.textOffsetY,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [slides, keyword, ctaLayout, coverPosition]);

  const downloadSlide = useCallback(async (i: number) => {
    setDownloading(i);
    setExportError(null);
    await ensureDataUrls();
    // Wait for the portal-rendered export ref to be populated (up to 2s)
    let el = exportRefs.current[i];
    if (!el) {
      for (let attempt = 0; attempt < 10 && !el; attempt++) {
        await new Promise(r => setTimeout(r, 200));
        el = exportRefs.current[i];
      }
    }
    if (!el) {
      setExportError('Slide element not ready — wait a moment and try again.');
      setDownloading(null);
      return;
    }
    try {
      await preloadFonts();
      await waitForImages(el);
      // 500ms lets CSS paint and GPU compositing finish after fonts + images are ready
      await new Promise(r => setTimeout(r, 500));
      let png: string;
      try {
        png = await toPng(el, { pixelRatio: 1, cacheBust: true, width: 1080, height: 1350, backgroundColor: '#1A1A1A' });
      } catch {
        await new Promise(r => setTimeout(r, 600));
        png = await toPng(el, { pixelRatio: 1, cacheBust: true, width: 1080, height: 1350, backgroundColor: '#1A1A1A' });
      }
      const a = document.createElement('a'); a.href = png; a.download = `carousel-slide-${i + 1}.png`; a.click();
    } catch (e: any) {
      console.error('Export error', e);
      setExportError(`Export failed: ${e?.message || 'unknown error'}. Try refreshing and exporting again.`);
    }
    setDownloading(null);
  }, [ensureDataUrls]);

  const downloadZip = useCallback(async () => {
    setDownloading('zip');
    setExportError(null);
    await ensureDataUrls();
    try {
      await preloadFonts();
      await new Promise(r => setTimeout(r, 500));
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      let missingRefs = 0;
      for (let i = 0; i < slides.length; i++) {
        // Retry up to 10 times (2s total) waiting for the ref to be populated before giving up
        let el = exportRefs.current[i];
        if (!el) {
          for (let attempt = 0; attempt < 10 && !el; attempt++) {
            await new Promise(r => setTimeout(r, 200));
            el = exportRefs.current[i];
          }
        }
        if (!el) { missingRefs++; continue; }
        await waitForImages(el);
        let png: string;
        try {
          png = await toPng(el, { pixelRatio: 1, cacheBust: true, width: 1080, height: 1350, backgroundColor: '#1A1A1A' });
        } catch {
          await new Promise(r => setTimeout(r, 600));
          png = await toPng(el, { pixelRatio: 1, cacheBust: true, width: 1080, height: 1350, backgroundColor: '#1A1A1A' });
        }
        zip.file(`slide-${String(i + 1).padStart(2, '0')}.png`, png.replace(/^data:image\/png;base64,/, ''), { base64: true });
        await new Promise(r => setTimeout(r, 200));
      }
      if (missingRefs > 0) {
        console.warn(`ZIP export: ${missingRefs} slide ref(s) were null and skipped. Refresh and retry if slides are missing.`);
      }
      zip.file('instagram-caption.txt', caption || '(no caption)');
      zip.file('carousel-data.json', JSON.stringify({ topic: store.topic, keyword, slides: slides.map(s => ({ text: s.text, visual_type: s.visual_type })), caption }, null, 2));
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const safeSlug = store.topic.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40) || 'carousel';
      const a = document.createElement('a'); a.href = url; a.download = `carousel-${safeSlug}.zip`; a.click();
      URL.revokeObjectURL(url);
      if (missingRefs > 0) {
        setExportError(`ZIP created but ${missingRefs} slide(s) were missing — scroll down and retry if any are absent.`);
      }
    } catch (e: any) {
      console.error('ZIP export error', e);
      setExportError(`ZIP export failed: ${e?.message || 'unknown error'}. Try downloading slides individually.`);
    }
    setDownloading(null);
  }, [slides, caption, keyword, store.topic, ensureDataUrls]);

  const scheduleCaptionReset = useCallback(() => {
    if (captionCopiedTimer.current) clearTimeout(captionCopiedTimer.current);
    setCaptionCopied(true);
    captionCopiedTimer.current = setTimeout(() => setCaptionCopied(false), 2000);
  }, []);

  const copyCaption = () => {
    navigator.clipboard.writeText(caption).then(() => {
      scheduleCaptionReset();
    }).catch(() => {
      // Clipboard access denied — fall back to execCommand
      try {
        const ta = document.createElement('textarea');
        ta.value = caption;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        scheduleCaptionReset();
      } catch { /* silent */ }
    });
  };

  const [confirmReset, setConfirmReset] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const handleReset = () => {
    if (confirmReset) {
      store.reset();
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3500);
    }
  };

  const isBusy = downloading !== null || proxyingImages;

  return (
    <>
    <div className="p-6 max-w-4xl mx-auto space-y-5" style={{ position: 'relative' }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Export Carousel</h3>
          <p className="text-xs text-gray-500 mt-0.5">{slides.length} slides ready. Download individually or as a ZIP package.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadSlide(safeIdx)} disabled={isBusy}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-colors disabled:opacity-40">
            {downloading === safeIdx || proxyingImages ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} This Slide
          </button>
          <button onClick={downloadZip} disabled={isBusy}
            className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg bg-brand-orange/20 border border-brand-orange/30 hover:bg-brand-orange/30 transition-colors disabled:opacity-40">
            {downloading === 'zip' || proxyingImages ? <Loader2 size={12} className="animate-spin" /> : <Package size={12} />}
            {proxyingImages ? 'Preparing...' : downloading === 'zip' ? 'Packaging...' : 'Download ZIP'}
          </button>
        </div>
      </div>

      {/* Export error banner */}
      {exportError && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-400">{exportError}</span>
        </div>
      )}

      {/* Slide viewer */}
      <div className="flex items-center gap-4">
        <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={safeIdx === 0}
          className="p-2 rounded-xl hover:bg-white/5 text-gray-600 hover:text-white disabled:opacity-20"><ChevronLeft size={20} /></button>
        <div className="flex-1 flex justify-center">
          <div ref={previewContainerRef} style={{ width: '100%', maxWidth: 400, aspectRatio: '4/5', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 12, opacity: previewScale > 0 ? 1 : 0, transition: 'opacity 0.15s' }}>
              <div style={{ transform: `scale(${previewScale || 0.74})`, transformOrigin: 'top left', width: 540, height: 675 }}>
                {renderSlides[safeIdx] && <SlideRenderer slide={renderSlides[safeIdx]} slideNumber={safeIdx + 1} totalSlides={slides.length} />}
              </div>
            </div>
          </div>
        </div>
        <button onClick={() => setCurrentIdx(i => Math.min(slides.length - 1, i + 1))} disabled={safeIdx === slides.length - 1}
          className="p-2 rounded-xl hover:bg-white/5 text-gray-600 hover:text-white disabled:opacity-20"><ChevronRight size={20} /></button>
      </div>

      {/* Thumbnail strip — click to navigate, click download icon to export that slide */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 justify-center">
        {slides.map((s, i) => (
          <button key={s.id} onClick={() => setCurrentIdx(i)}
            className={`relative flex-shrink-0 w-12 rounded-lg border overflow-hidden transition-all ${i === safeIdx ? 'border-brand-orange ring-1 ring-brand-orange/30' : 'border-white/10 opacity-60 hover:opacity-100'}`}
            style={{ aspectRatio: '4/5' }}
            title={`Slide ${i + 1}`}>
            {s.backgroundImage
              ? <img src={s.backgroundImage} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-[#111] flex items-center justify-center text-[9px] text-gray-600">{i + 1}</div>}
            {i === safeIdx && (
              <div className="absolute inset-0 bg-brand-orange/10 flex items-end justify-center pb-0.5">
                <div className="text-[7px] font-bold text-brand-orange">{i + 1}</div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Caption — always rendered so users can write one even if AI returned empty */}
      <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Instagram Caption</span>
          <button onClick={copyCaption} disabled={!caption} className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 disabled:opacity-30">
            {captionCopied ? <><Check size={11} className="text-green-400" /><span className="text-green-400">Copied!</span></> : <><Copy size={11} />Copy</>}
          </button>
        </div>
        <textarea value={caption} onChange={e => store.setCaption(e.target.value)}
          placeholder="Write your Instagram caption here..."
          className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 leading-relaxed resize-y focus:outline-none focus:border-brand-orange/30 placeholder-gray-700" rows={10} />
        {keyword && <div className="flex items-center gap-2"><span className="text-xs text-gray-600">Keyword:</span><span className="text-xs font-bold text-brand-orange bg-brand-orange/10 px-2.5 py-0.5 rounded-full">{keyword}</span></div>}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button onClick={() => store.setStep(3)}
          className="flex-none bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white font-medium py-3 px-5 rounded-xl transition-colors text-sm">
          ← Back
        </button>
        <button onClick={handleReset}
          className={`flex-1 border py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors ${confirmReset ? 'border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'border-white/10 hover:border-white/20 text-gray-400 hover:text-white'}`}>
          <RotateCcw size={14} /> {confirmReset ? 'Confirm — lose all slides?' : 'Start New Carousel'}
        </button>
      </div>

    </div>

    {/* Hidden export renders in a portal — escapes overflow:auto parent so html-to-image
        captures the full 1080×1350 without clipping. Fixed positioning avoids affecting page layout. */}
    {isMounted && createPortal(
      <div style={{ position: 'fixed', left: '-99999px', top: 0, pointerEvents: 'none', zIndex: -1 }} aria-hidden="true">
        {renderSlides.map((slide, i) => (
          <SlideRenderer key={slide.id || i} ref={el => { exportRefs.current[i] = el; }} slide={slide} slideNumber={i + 1} totalSlides={slides.length} forExport />
        ))}
      </div>,
      document.body
    )}
    </>
  );
}

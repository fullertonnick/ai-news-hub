'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useCarouselStore, type TextOverlay } from '../../stores/useCarouselStore';
import { Check, Trash2, ChevronLeft, ChevronRight, Upload, Loader2, Wand2, Type, ArrowUp, ArrowDown, Search } from 'lucide-react';
import SlideRenderer from '../SlideRenderer';
import type { StickerOverlay } from '../../types';
import { FONT_OPTIONS } from '../../lib/fonts';

// Konva needs window — dynamic import with SSR off
const KonvaEditor = dynamic(() => import('./KonvaEditor'), { ssr: false });

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function svgUri(svg: string) { return 'data:image/svg+xml,' + encodeURIComponent(svg); }

// ─── Real brand SVGs (Simple Icons paths) ───────────────────────────────────
interface BankSticker { label: string; src: string; category: string; }

function brandIcon(path: string, fill: string, bg: string) {
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" rx="40" fill="${bg}"/><g transform="translate(38,38) scale(5.167)"><path d="${path}" fill="${fill}"/></g></svg>`);
}
function badgeSvg(bg: string, text: string, w = 200) {
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="76" viewBox="0 0 ${w} 76"><rect width="${w}" height="76" rx="14" fill="${bg}"/><text x="${w/2}" y="52" font-family="system-ui,-apple-system,sans-serif" font-size="32" font-weight="800" fill="white" text-anchor="middle">${text}</text></svg>`);
}

const SI = {
  anthropic: 'M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z',
  openai: 'M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729z',
  gemini: 'M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81',
  vscode: 'M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z',
  slack: 'M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z',
  notion: 'M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466z',
  n8n: 'M21.4737 5.6842c-1.1772 0-2.1663.8051-2.4468 1.8947h-2.8955c-1.235 0-2.289.893-2.492 2.111l-.1038.623a1.263 1.263 0 0 1-1.246 1.0555H11.289c-.2805-1.0896-1.2696-1.8947-2.4468-1.8947s-2.1663.8051-2.4467 1.8947H4.973c-.2805-1.0896-1.2696-1.8947-2.4468-1.8947C1.1311 9.4737 0 10.6047 0 12s1.131 2.5263 2.5263 2.5263c1.1772 0 2.1663-.8051 2.4468-1.8947h1.4223',
  hubspot: 'M18.164 7.93V5.084a2.198 2.198 0 001.267-1.978v-.067A2.2 2.2 0 0017.238.845h-.067a2.2 2.2 0 00-2.193 2.193v.067a2.196 2.196 0 001.252 1.973',
  salesforce: 'M10.006 5.415a4.195 4.195 0 013.045-1.306c1.56 0 2.954.9 3.69 2.205.63-.3 1.35-.45 2.1-.45 2.85 0 5.159 2.34 5.159 5.22s-2.31 5.22-5.176 5.22',
  replicate: 'M24 10.262v2.712h-9.518V24h-3.034V10.262zm0-5.131v2.717H8.755V24H5.722V5.131zM24 0v2.717H3.034V24H0V0z',
  cursor: 'M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0',
};

const STICKER_BANK: BankSticker[] = [
  { label: 'Anthropic', src: brandIcon(SI.anthropic, '#fff', '#191919'), category: 'AI Tools' },
  { label: 'OpenAI', src: brandIcon(SI.openai, '#fff', '#412991'), category: 'AI Tools' },
  { label: 'Gemini', src: brandIcon(SI.gemini, '#fff', '#8E75B2'), category: 'AI Tools' },
  { label: 'VS Code', src: brandIcon(SI.vscode, '#fff', '#007ACC'), category: 'AI Tools' },
  { label: 'Cursor', src: brandIcon(SI.cursor, '#fff', '#000'), category: 'AI Tools' },
  { label: 'Replicate', src: brandIcon(SI.replicate, '#fff', '#111'), category: 'AI Tools' },
  { label: 'Slack', src: brandIcon(SI.slack, '#fff', '#4A154B'), category: 'Automation' },
  { label: 'Notion', src: brandIcon(SI.notion, '#fff', '#000'), category: 'Automation' },
  { label: 'n8n', src: brandIcon(SI.n8n, '#fff', '#EA4B71'), category: 'Automation' },
  { label: 'HubSpot', src: brandIcon(SI.hubspot, '#fff', '#FF7A59'), category: 'Automation' },
  { label: 'Airtable', src: svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" rx="40" fill="#18BFFF"/><g transform="translate(38,38) scale(5.167)"><path d="M11.992 1.966c-.434 0-.87.086-1.28.257L1.779 5.917c-.503.208-.49.908.012 1.116l8.982 3.558a3.266 3.266 0 0 0 2.454 0l8.982-3.558c.503-.196.503-.908.012-1.116l-8.957-3.694a3.255 3.255 0 0 0-1.272-.257z" fill="#fff"/></g></svg>`), category: 'Automation' },
  { label: 'Salesforce', src: brandIcon(SI.salesforce, '#fff', '#00A1E0'), category: 'Automation' },
  { label: '→', src: svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="#FF7107" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>'), category: 'Icons' },
  { label: '↓', src: svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="#FF7107" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>'), category: 'Icons' },
  { label: '✓', src: svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'), category: 'Icons' },
  { label: '✕', src: svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'), category: 'Icons' },
  { label: '⚡', src: svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="#FF7107"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'), category: 'Icons' },
  { label: '①', src: svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="90" fill="#FF7107"/><text x="100" y="128" font-family="system-ui" font-size="110" font-weight="800" fill="white" text-anchor="middle">1</text></svg>'), category: 'Icons' },
  { label: '②', src: svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="90" fill="#FF7107"/><text x="100" y="128" font-family="system-ui" font-size="110" font-weight="800" fill="white" text-anchor="middle">2</text></svg>'), category: 'Icons' },
  { label: '③', src: svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="90" fill="#FF7107"/><text x="100" y="128" font-family="system-ui" font-size="110" font-weight="800" fill="white" text-anchor="middle">3</text></svg>'), category: 'Icons' },
  { label: 'FREE', src: badgeSvg('#FF7107', 'FREE'), category: 'Badges' },
  { label: 'NEW', src: badgeSvg('#22C55E', 'NEW'), category: 'Badges' },
  { label: 'SAVE THIS', src: badgeSvg('#1D9BF0', 'SAVE THIS', 240), category: 'Badges' },
  { label: 'PRO TIP', src: badgeSvg('#A855F7', 'PRO TIP', 220), category: 'Badges' },
  { label: 'TUTORIAL', src: badgeSvg('#E11D48', 'TUTORIAL', 240), category: 'Badges' },
  { label: 'BEFORE', src: badgeSvg('#EF4444', 'BEFORE', 200), category: 'Badges' },
  { label: 'AFTER', src: badgeSvg('#22C55E', 'AFTER', 200), category: 'Badges' },
];
const CATEGORIES = ['All', ...Array.from(new Set(STICKER_BANK.map(s => s.category)))];

// ─── Component ──────────────────────────────────────────────────────────────

export default function Step3Edit() {
  const store = useCarouselStore();
  const { slides, keyword, ctaLayout, coverPosition } = store;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [generatingVisual, setGeneratingVisual] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [showWebSearch, setShowWebSearch] = useState(false);
  const [webQuery, setWebQuery] = useState('');
  const [webResults, setWebResults] = useState<Array<{ url: string; thumbnail: string; title: string; source: string }>>([]);
  const [searchingWeb, setSearchingWeb] = useState(false);
  const [importingImage, setImportingImage] = useState<string | null>(null);

  const slide = slides[currentIdx];
  const stickers = slide?.stickers || [];
  const textOverlays = slide?.textOverlays || [];
  const filteredBank = selectedCategory === 'All' ? STICKER_BANK : STICKER_BANK.filter(s => s.category === selectedCategory);

  // No auto-convert anymore — we make the baked-in text directly draggable below.

  // ── Draggable text handle for the slide's main text block ──
  const textDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const handleTextDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!slide) return;
    e.preventDefault();
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    textDragRef.current = {
      startX: clientX, startY: clientY,
      origX: slide.textOffsetX || 0,
      origY: slide.textOffsetY || 0,
    };
  }, [slide]);

  useEffect(() => {
    const move = (e: MouseEvent | TouchEvent) => {
      if (!textDragRef.current || !slide) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      // Preview is 360px wide, slide internal coords are 1080. So 1px preview = 3px slide.
      // textOffset is stored in 1080-unit pixels.
      const dxPreview = clientX - textDragRef.current.startX;
      const dyPreview = clientY - textDragRef.current.startY;
      const dxSlide = dxPreview * (1080 / 360); // = dxPreview * 3
      const dySlide = dyPreview * (1350 / 450); // = dyPreview * 3
      const newX = Math.max(-500, Math.min(500, textDragRef.current.origX + dxSlide));
      const newY = Math.max(-500, Math.min(500, textDragRef.current.origY + dySlide));
      store.setTextOffset(slide.id, Math.round(newX), Math.round(newY));
    };
    const end = () => { textDragRef.current = null; };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    window.addEventListener('touchmove', move);
    window.addEventListener('touchend', end);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', end);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
    };
  }, [slide, store]);

  const buildRenderSlide = (s: typeof slides[0], i: number) => {
    const isFirst = i === 0, isLast = i === slides.length - 1;
    let visual: any;
    if (isFirst) visual = { type: 'cover_photo', gradient_hue: 25, position: coverPosition };
    else if (isLast) visual = { type: 'cta_slide', keyword, layout_variant: ctaLayout };
    else visual = s.visual || { type: s.visual_type || 'none' };
    return {
      text: s.text,
      accent_word: s.accent_word,
      section_label: s.section_label,
      visual,
      backgroundImage: s.backgroundImage,
      textOffsetX: s.textOffsetX,
      textOffsetY: s.textOffsetY,
    };
  };

  const addSticker = useCallback((bs: BankSticker) => {
    if (!slide) return;
    const s: StickerOverlay = { id: uid(), src: bs.src, label: bs.label, x: 50, y: 40, width: 20, rotation: 0, opacity: 1, zIndex: 10 + stickers.length };
    store.addSticker(slide.id, s);
    setSelectedId(s.id);
  }, [slide, store, stickers.length]);

  const addText = useCallback(() => {
    if (!slide) return;
    const t: TextOverlay = { id: uid(), text: 'Edit this text', x: 50, y: 30, fontSize: 40, fontWeight: 700, color: '#FFFFFF', maxWidth: 80, zIndex: 5 + textOverlays.length };
    store.addTextOverlay(slide.id, t);
    // Defer select so Konva has time to mount the new node before drag
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setSelectedId(t.id));
    });
  }, [slide, store, textOverlays.length]);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !slide) return;
    const reader = new FileReader();
    reader.onload = () => {
      const s: StickerOverlay = { id: uid(), src: reader.result as string, label: file.name.replace(/\.\w+$/, ''), x: 50, y: 40, width: 30, rotation: 0, opacity: 1, zIndex: 10 + stickers.length };
      store.addSticker(slide.id, s);
      setSelectedId(s.id);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [slide, store, stickers.length]);

  const generateVisual = useCallback(async (prompt?: string) => {
    if (!slide) return;
    setGeneratingVisual(true);
    try {
      const p = prompt || `Create a clean visual explaining: "${slide.text.slice(0, 200)}". Dark background, modern UI mockup or diagram. No text. Square.`;
      const r = await fetch('/api/imagen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: p }) });
      const d = await r.json();
      if (d.dataUrl) {
        const s: StickerOverlay = { id: uid(), src: d.dataUrl, label: prompt ? 'Custom Visual' : 'AI Visual', x: 50, y: 55, width: 60, rotation: 0, opacity: 0.9, zIndex: 10 + stickers.length };
        store.addSticker(slide.id, s);
        setSelectedId(s.id);
        setCustomPrompt('');
        setShowPrompt(false);
      }
    } catch {}
    setGeneratingVisual(false);
  }, [slide, store, stickers.length]);

  const searchWebImages = useCallback(async () => {
    if (!webQuery.trim()) return;
    setSearchingWeb(true);
    setWebResults([]);
    try {
      const r = await fetch('/api/image-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: webQuery }),
      });
      const d = await r.json();
      if (d.images) setWebResults(d.images);
      else if (d.error) console.error('Search error:', d.error, d.hint);
    } catch (e) { console.error('Web search failed:', e); }
    setSearchingWeb(false);
  }, [webQuery]);

  const importWebImage = useCallback(async (img: { url: string; title: string }) => {
    if (!slide) return;
    setImportingImage(img.url);
    try {
      const r = await fetch('/api/image-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: img.url }),
      });
      const d = await r.json();
      if (d.dataUrl) {
        const s: StickerOverlay = { id: uid(), src: d.dataUrl, label: img.title.slice(0, 30) || 'Web Image', x: 50, y: 55, width: 60, rotation: 0, opacity: 1, zIndex: 10 + stickers.length };
        store.addSticker(slide.id, s);
        setSelectedId(s.id);
        setShowWebSearch(false);
        setWebResults([]);
        setWebQuery('');
      }
    } catch (e) { console.error('Import failed:', e); }
    setImportingImage(null);
  }, [slide, store, stickers.length]);

  if (!slide) return null;

  const selSticker = selectedId ? stickers.find(s => s.id === selectedId) : null;
  const selText = selectedId ? textOverlays.find(t => t.id === selectedId) : null;
  const layers = [...stickers.map(s => ({ kind: 'sticker' as const, id: s.id, label: s.label, z: s.zIndex || 10 })), ...textOverlays.map(t => ({ kind: 'text' as const, id: t.id, label: t.text.slice(0, 20), z: t.zIndex || 5 }))].sort((a, b) => b.z - a.z);

  // Preview dimensions
  const PW = 360, PH = 450;
  const renderSlide = buildRenderSlide(slide, currentIdx);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <h3 className="text-sm font-bold text-white">Edit Slides</h3>
      <p className="text-xs text-gray-500">Drag stickers and text to position. Resize with handles. Add AI visuals, logos, or uploaded images.</p>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Preview + Konva */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => { setCurrentIdx(i => Math.max(0, i - 1)); setSelectedId(null); }} disabled={currentIdx === 0} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-600 hover:text-white disabled:opacity-20"><ChevronLeft size={16} /></button>
            <span className="text-xs text-gray-400 font-medium">Slide {currentIdx + 1} / {slides.length}</span>
            <button onClick={() => { setCurrentIdx(i => Math.min(slides.length - 1, i + 1)); setSelectedId(null); }} disabled={currentIdx === slides.length - 1} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-600 hover:text-white disabled:opacity-20"><ChevronRight size={16} /></button>
            <div className="ml-auto flex gap-1.5">
              <button onClick={addText} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white border border-white/10 hover:border-white/20 px-2 py-1 rounded-lg"><Type size={10} /> Text</button>
              <button onClick={() => { setShowWebSearch(!showWebSearch); setShowPrompt(false); }} className="flex items-center gap-1 text-[10px] text-white bg-white/10 hover:bg-white/20 border border-white/15 px-2 py-1 rounded-lg font-bold"><Search size={10} /> Web Image</button>
              <button onClick={() => { setShowPrompt(!showPrompt); setShowWebSearch(false); }} className="flex items-center gap-1 text-[10px] text-black bg-brand-orange hover:bg-orange-500 px-2 py-1 rounded-lg font-bold"><Wand2 size={10} /> AI Visual</button>
            </div>
          </div>

          {showPrompt && (
            <div className="mb-3 rounded-xl border border-brand-orange/20 bg-brand-orange/[0.03] p-3 space-y-2">
              <div className="text-[10px] font-bold text-brand-orange uppercase tracking-widest">AI Visual (Nano Banana Pro)</div>
              <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
                placeholder="Describe the visual... e.g. 'Dark UI showing a Make.com workflow with webhook trigger and Slack output'"
                className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 resize-none focus:outline-none focus:border-brand-orange/30" rows={2} />
              <div className="flex gap-2">
                <button onClick={() => generateVisual(customPrompt || undefined)} disabled={generatingVisual}
                  className="flex items-center gap-1 text-xs font-bold text-black bg-brand-orange hover:bg-orange-500 disabled:opacity-40 px-3 py-1.5 rounded-lg">
                  {generatingVisual ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                  {generatingVisual ? 'Generating...' : 'Generate'}
                </button>
                <button onClick={() => generateVisual()} disabled={generatingVisual} className="text-xs text-gray-400 hover:text-white px-2 py-1.5">Auto</button>
              </div>
            </div>
          )}

          {showWebSearch && (
            <div className="mb-3 rounded-xl border border-white/15 bg-white/[0.03] p-3 space-y-2">
              <div className="text-[10px] font-bold text-white uppercase tracking-widest">Web Image Search</div>
              <div className="flex gap-2">
                <input value={webQuery} onChange={e => setWebQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') searchWebImages(); }}
                  placeholder="claude code terminal screenshot"
                  className="flex-1 bg-white/[0.02] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-white/20" />
                <button onClick={searchWebImages} disabled={searchingWeb || !webQuery.trim()}
                  className="flex items-center gap-1 text-xs font-bold text-black bg-white hover:bg-gray-200 disabled:opacity-40 px-3 py-1.5 rounded-lg">
                  {searchingWeb ? <Loader2 size={10} className="animate-spin" /> : <Search size={10} />}
                  Search
                </button>
              </div>
              {webResults.length > 0 && (
                <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pt-1">
                  {webResults.map((img, i) => (
                    <button key={i} onClick={() => importWebImage(img)} disabled={importingImage === img.url}
                      className="relative aspect-square rounded border border-white/10 overflow-hidden hover:border-brand-orange/40 transition-all disabled:opacity-40">
                      <img src={img.thumbnail} alt={img.title} className="w-full h-full object-cover" />
                      {importingImage === img.url && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 size={14} className="animate-spin text-brand-orange" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {!searchingWeb && webResults.length === 0 && webQuery && (
                <p className="text-[10px] text-gray-500">Press search or hit enter. Requires Google Custom Search API configured in env vars.</p>
              )}
            </div>
          )}

          {/* Canvas area — internal coords are 540x675 (SlideRenderer preview), CSS-scaled to PW/PH */}
          <div style={{ width: PW, height: PH, position: 'relative', margin: '0 auto', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, transform: `scale(${PW / 540})`, transformOrigin: 'top left', width: 540, height: 675 }}>
              {/* Base slide render */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <SlideRenderer slide={renderSlide} slideNumber={currentIdx + 1} totalSlides={slides.length} />
              </div>
              {/* Konva editor for stickers — same 540x675 coordinate space */}
              <KonvaEditor
                stickers={stickers}
                textOverlays={textOverlays}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onUpdateSticker={(id, u) => store.updateSticker(slide.id, id, u)}
                onUpdateTextOverlay={(id, u) => store.updateTextOverlay(slide.id, id, u)}
                width={540}
                height={675}
              />
              {/* Draggable text region — sits ABOVE Konva so text drag wins. Internal coord space is 540x675. */}
              {currentIdx > 0 && currentIdx < slides.length - 1 && (
                <div
                  onMouseDown={handleTextDragStart}
                  onTouchStart={handleTextDragStart}
                  style={{
                    position: 'absolute',
                    // Text block is at padding 100 top, 60 sides, 160 bottom in 1080-scale
                    // In 540-scale: 50 top, 30 sides, 80 bottom. Plus the offset (also in 1080 → /2).
                    left: `${30 + (slide?.textOffsetX || 0) / 2}px`,
                    top: `${50 + (slide?.textOffsetY || 0) / 2}px`,
                    width: '480px',
                    height: '545px',
                    cursor: 'move',
                    zIndex: 25,
                    border: '2px dashed rgba(255,113,7,0.5)',
                    borderRadius: 12,
                    background: 'rgba(255,113,7,0.06)',
                    touchAction: 'none',
                  }}
                  title="Drag to move slide text"
                >
                  <div style={{
                    position: 'absolute', top: 6, left: 10,
                    fontSize: 13, fontWeight: 800, color: '#FF7107',
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                    fontFamily: 'system-ui, sans-serif',
                    pointerEvents: 'none',
                    background: 'rgba(0,0,0,0.6)',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}>↕ Drag text</div>
                </div>
              )}
            </div>
          </div>

          {/* Thumbnails */}
          <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
            {slides.map((s, i) => (
              <button key={s.id} onClick={() => { setCurrentIdx(i); setSelectedId(null); }}
                className={`relative flex-shrink-0 w-10 rounded border overflow-hidden transition-all ${i === currentIdx ? 'border-brand-orange ring-1 ring-brand-orange/30' : 'border-white/10 opacity-50 hover:opacity-100'}`}
                style={{ aspectRatio: '4/5' }}>
                {s.backgroundImage ? <img src={s.backgroundImage} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#111] flex items-center justify-center text-[8px] text-gray-600">{i + 1}</div>}
                {((s.stickers?.length || 0) + (s.textOverlays?.length || 0)) > 0 && (
                  <div className="absolute top-0 right-0 w-3 h-3 bg-brand-orange rounded-full flex items-center justify-center text-[6px] text-white font-bold">{(s.stickers?.length || 0) + (s.textOverlays?.length || 0)}</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="w-full lg:w-72 space-y-4">
          {/* Layers */}
          {layers.length > 0 && (
            <div>
              <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Layers</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {layers.map(l => (
                  <div key={l.id} onClick={() => setSelectedId(l.id === selectedId ? null : l.id)}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer transition-all ${l.id === selectedId ? 'border-brand-orange/40 bg-brand-orange/10' : 'border-white/10 bg-white/[0.02]'}`}>
                    <span className="text-[9px] text-gray-500 w-3">{l.z}</span>
                    <span className="text-[10px] text-gray-300 flex-1 truncate">{l.kind === 'text' ? '📝' : '🖼'} {l.label}</span>
                    <button onClick={e => { e.stopPropagation(); const nz = l.z + 1; l.kind === 'sticker' ? store.updateSticker(slide.id, l.id, { zIndex: nz }) : store.updateTextOverlay(slide.id, l.id, { zIndex: nz }); }} className="p-0.5 text-gray-500 hover:text-white"><ArrowUp size={9} /></button>
                    <button onClick={e => { e.stopPropagation(); const nz = Math.max(1, l.z - 1); l.kind === 'sticker' ? store.updateSticker(slide.id, l.id, { zIndex: nz }) : store.updateTextOverlay(slide.id, l.id, { zIndex: nz }); }} className="p-0.5 text-gray-500 hover:text-white"><ArrowDown size={9} /></button>
                    <button onClick={e => { e.stopPropagation(); l.kind === 'sticker' ? store.removeSticker(slide.id, l.id) : store.removeTextOverlay(slide.id, l.id); if (selectedId === l.id) setSelectedId(null); }} className="p-0.5 text-gray-600 hover:text-red-400"><Trash2 size={9} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sticker properties */}
          {selSticker && (
            <div className="rounded-xl border border-brand-orange/20 bg-brand-orange/[0.03] p-3 space-y-2">
              <div className="text-[10px] font-bold text-brand-orange uppercase tracking-widest">{selSticker.label}</div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[9px] text-gray-500">Size</label><input type="range" min={5} max={80} value={selSticker.width} onChange={e => store.updateSticker(slide.id, selectedId!, { width: +e.target.value })} className="w-full accent-orange-500" /></div>
                <div><label className="text-[9px] text-gray-500">Opacity</label><input type="range" min={10} max={100} value={Math.round(selSticker.opacity * 100)} onChange={e => store.updateSticker(slide.id, selectedId!, { opacity: +e.target.value / 100 })} className="w-full accent-orange-500" /></div>
              </div>
            </div>
          )}

          {/* Text properties */}
          {selText && (
            <div className="rounded-xl border border-brand-orange/20 bg-brand-orange/[0.03] p-3 space-y-2">
              <div className="text-[10px] font-bold text-brand-orange uppercase tracking-widest">Text</div>
              <textarea value={selText.text} onChange={e => store.updateTextOverlay(slide.id, selectedId!, { text: e.target.value })}
                className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white resize-none focus:outline-none focus:border-brand-orange/30" rows={2} />
              <div>
                <label className="text-[9px] text-gray-500 block mb-0.5">Font</label>
                <select value={selText.fontFamily || FONT_OPTIONS[0].family}
                  onChange={e => store.updateTextOverlay(slide.id, selectedId!, { fontFamily: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded px-2 py-1 text-[10px] text-gray-300 focus:outline-none focus:border-brand-orange/30">
                  {FONT_OPTIONS.map(f => (
                    <option key={f.label} value={f.family} style={{ fontFamily: f.family }}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[9px] text-gray-500">Size</label><input type="range" min={16} max={80} value={selText.fontSize} onChange={e => store.updateTextOverlay(slide.id, selectedId!, { fontSize: +e.target.value })} className="w-full accent-orange-500" /></div>
                <div><label className="text-[9px] text-gray-500">Weight</label>
                  <select value={selText.fontWeight} onChange={e => store.updateTextOverlay(slide.id, selectedId!, { fontWeight: +e.target.value })} className="w-full bg-black border border-white/10 rounded px-1 py-0.5 text-[10px] text-gray-300">
                    <option value={400}>Normal</option><option value={700}>Bold</option><option value={800}>Extra Bold</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-1">
                {['#FFFFFF', '#FF7107', '#22C55E', '#1D9BF0', '#A855F7', '#EF4444'].map(c => (
                  <button key={c} onClick={() => store.updateTextOverlay(slide.id, selectedId!, { color: c })}
                    className={`w-5 h-5 rounded-full border-2 ${selText.color === c ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          )}

          {/* Sticker Bank */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-gray-600 uppercase tracking-widest">Stickers</div>
              <label className="text-[10px] text-brand-orange flex items-center gap-1 cursor-pointer"><Upload size={10} /> Upload<input type="file" accept="image/*" className="hidden" onChange={handleUpload} /></label>
            </div>
            <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`text-[10px] px-2.5 py-1 rounded-full border whitespace-nowrap ${selectedCategory === cat ? 'border-brand-orange/40 bg-brand-orange/10 text-brand-orange' : 'border-white/10 text-gray-500 hover:text-white'}`}>{cat}</button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto">
              {filteredBank.map((s, i) => (
                <button key={i} onClick={() => addSticker(s)} className="flex flex-col items-center gap-1 p-2 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-brand-orange/20 group" title={s.label}>
                  <img src={s.src} alt={s.label} className="w-8 h-8 object-contain" />
                  <span className="text-[7px] text-gray-500 group-hover:text-white truncate w-full text-center">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button onClick={() => { store.approve('edit'); store.setStep(4); }}
        className="w-full bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
        <Check size={14} /> Continue to Export
      </button>
    </div>
  );
}

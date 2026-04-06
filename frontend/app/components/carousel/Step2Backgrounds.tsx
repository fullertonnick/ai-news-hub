'use client';
import { useCallback, useState, useRef } from 'react';
import { useCarouselStore } from '../../stores/useCarouselStore';
import { Loader2, RefreshCw, Check, ChevronDown, ChevronUp, Image } from 'lucide-react';

// ─── Prompt builders ─────────────────────────────────────────────────────────

function buildCoverPrompt(headline: string): string {
  return `Instagram carousel cover slide. Portrait 3:4 ratio. Premium dark mode SaaS design.

BACKGROUND: Near-black (#0A0A0A) background with subtle dark gray isometric grid lines. Soft volumetric orange (#FF7107) gradient glow in the bottom-left corner. Subtle cyan accent light in the top-right. Minimal floating geometric particles. Premium futuristic enterprise aesthetic.

TEXT LAYOUT: The headline text "${headline}" must be rendered in large bold white sans-serif font (similar to Plus Jakarta Sans or Inter Black). The text should be positioned in the lower-third of the image, left-aligned with generous padding. The headline should be the dominant visual element — massive, impactful, filling at least 60% of the width.

BRANDING: Small "@thenickcornelius" in thin white text at the bottom-left corner. Small "save for later" with a bookmark icon at the bottom-right corner. Both very subtle, small, not distracting.

STYLE: This must look like it was designed in Figma by a senior product designer. Clean, modern, premium. Dark mode. Think Linear, Vercel, or Raycast marketing materials. The text must be perfectly crisp and readable.

CRITICAL: Render the headline text EXACTLY as written. Do not add, remove, or change any words. The text must be sharp, legible, and the focal point of the image. No faces, no people, no photographs.`;
}

function buildCTAPrompt(ctaText: string, keyword: string): string {
  return `Instagram carousel CTA (call-to-action) slide. Portrait 3:4 ratio. Premium dark mode SaaS design.

BACKGROUND: Near-black (#0A0A0A) background with subtle dark gray isometric grid lines matching the content slides. Soft warm orange (#FF7107) radial glow emanating from center, creating a subtle spotlight effect. Minimal geometric accents. Same premium futuristic enterprise aesthetic as the rest of the carousel.

TEXT LAYOUT:
- Main text: "${ctaText}" in bold white sans-serif font, centered vertically in the upper portion of the image. Medium-large size.
- Below the main text: a small thin orange horizontal line divider (accent separator).
- Below the divider: "Comment" in regular white text, then "${keyword}" inside a solid rounded orange (#FF7107) pill/badge with black text inside, then "I'll send it over" in regular white text. All on the same line, centered.
- A small downward arrow below the CTA line in orange.

BRANDING: Small "@thenickcornelius" bottom-left. Small "save for later" with bookmark icon bottom-right. Both subtle and small.

STYLE: Must look like a premium SaaS product page CTA section. Clean, modern, dark mode. Figma-quality design. Text must be perfectly crisp and readable. Same visual language as the content slides (grid background, orange accents).

CRITICAL: Render ALL text EXACTLY as specified. The keyword "${keyword}" must appear inside an orange rounded rectangle pill. Do not change any words. No faces, no people, no photographs.`;
}

const MIDDLE_PROMPT =
  'Abstract premium SaaS product hero background. Pure near-black (#0A0A0A) background with subtle isometric grid pattern in thin dark gray lines. Minimal geometric floating elements. Soft volumetric orange (#FF7107) and cyan gradient accent lights in the upper corners. Depth and atmosphere with very subtle particles. Clean, futuristic, enterprise software aesthetic like Linear, Vercel, or Raycast dashboards. Premium UI design inspiration. Ready for text overlay with plenty of negative space. Dark mode aesthetic. 8K ultra minimal. No text, no typography, no letters, no numbers, no UI elements, no icons, no faces, no people.';

// ─── Component ────────────────────────────────────────────────────────────────

export default function Step2Backgrounds() {
  const slides = useCarouselStore(s => s.slides);
  const keyword = useCarouselStore(s => s.keyword);
  const bgLoading = useCarouselStore(s => s.bgLoading);
  const setBgLoading = useCarouselStore(s => s.setBgLoading);
  const setSlideBackground = useCarouselStore(s => s.setSlideBackground);
  const setSlideBackgroundStatus = useCarouselStore(s => s.setSlideBackgroundStatus);
  const setSlideBackgroundPrompt = useCarouselStore(s => s.setSlideBackgroundPrompt);
  const approve = useCarouselStore(s => s.approve);
  const setStep = useCarouselStore(s => s.setStep);

  const [expandedPrompt, setExpandedPrompt] = useState<'cover' | 'middle' | 'cta' | null>(null);
  const [localPrompts, setLocalPrompts] = useState<Record<string, string>>({});
  const generatingRef = useRef<Set<string>>(new Set());

  const coverSlide = slides[0];
  const ctaSlide = slides[slides.length - 1];
  const middleSlides = slides.slice(1, -1);
  const firstMiddle = middleSlides[0];

  // Default prompts
  const defaultCover = coverSlide ? buildCoverPrompt(coverSlide.text) : '';
  const defaultCta = ctaSlide ? buildCTAPrompt(ctaSlide.text, keyword || 'BUILD') : '';

  function getPrompt(slotId: string): string {
    if (slotId === 'cover') return localPrompts.cover || coverSlide?.backgroundPrompt || defaultCover;
    if (slotId === 'cta') return localPrompts.cta || ctaSlide?.backgroundPrompt || defaultCta;
    return localPrompts.middle || firstMiddle?.backgroundPrompt || MIDDLE_PROMPT;
  }

  function getSlideIds(slotId: string): string[] {
    if (slotId === 'cover') return coverSlide ? [coverSlide.id] : [];
    if (slotId === 'cta') return ctaSlide ? [ctaSlide.id] : [];
    return middleSlides.map(s => s.id);
  }

  const generateSlot = useCallback(async (slotId: 'cover' | 'middle' | 'cta') => {
    if (generatingRef.current.has(slotId)) return; // prevent double-fire
    generatingRef.current.add(slotId);

    const prompt = slotId === 'cover' ? (localPrompts.cover || defaultCover)
      : slotId === 'cta' ? (localPrompts.cta || defaultCta)
      : (localPrompts.middle || MIDDLE_PROMPT);

    const slideIds = slotId === 'cover' ? (coverSlide ? [coverSlide.id] : [])
      : slotId === 'cta' ? (ctaSlide ? [ctaSlide.id] : [])
      : middleSlides.map(s => s.id);

    slideIds.forEach(id => {
      setBgLoading(id, true);
      setSlideBackgroundStatus(id, 'generating');
      setSlideBackgroundPrompt(id, prompt);
    });

    try {
      const r = await fetch('/api/imagen', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const d = await r.json();
      if (d.dataUrl) {
        slideIds.forEach(id => setSlideBackground(id, d.dataUrl));
      } else {
        slideIds.forEach(id => setSlideBackgroundStatus(id, 'error'));
      }
    } catch {
      slideIds.forEach(id => setSlideBackgroundStatus(id, 'error'));
    }

    slideIds.forEach(id => setBgLoading(id, false));
    generatingRef.current.delete(slotId);
  }, [coverSlide, ctaSlide, middleSlides, localPrompts, defaultCover, defaultCta, setBgLoading, setSlideBackground, setSlideBackgroundStatus, setSlideBackgroundPrompt]);

  const generateAll = useCallback(async () => {
    await Promise.all([generateSlot('cover'), generateSlot('middle'), generateSlot('cta')]);
  }, [generateSlot]);

  const allDone = slides.every(s => s.backgroundStatus === 'done');
  const anyLoading = Object.values(bgLoading).some(Boolean);

  // Slot data for rendering
  const slotsConfig = [
    { id: 'cover' as const, label: 'Cover Slide (finished product)', desc: 'Complete cover with headline rendered', slide: coverSlide, final: true, text: coverSlide?.text },
    { id: 'middle' as const, label: 'Content Slides (shared background)', desc: `Premium grid background for ${middleSlides.length} middle slides`, slide: firstMiddle, final: false, text: undefined },
    { id: 'cta' as const, label: 'CTA Slide (finished product)', desc: 'Complete CTA with keyword pill rendered', slide: ctaSlide, final: true, text: ctaSlide?.text },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Generate Slides</h3>
          <p className="text-xs text-gray-500 mt-0.5">Cover and CTA are finished products. Middle slides share one premium background.</p>
        </div>
        <button onClick={generateAll} disabled={anyLoading}
          className="flex items-center gap-1.5 bg-brand-orange hover:bg-orange-500 disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
          {anyLoading ? <Loader2 size={14} className="animate-spin" /> : <Image size={14} />}
          {anyLoading ? 'Generating...' : 'Generate All 3'}
        </button>
      </div>

      <div className="space-y-3">
        {slotsConfig.map(slot => {
          const slide = slot.slide;
          const loading = slide ? bgLoading[slide.id] || false : false;
          const imageUrl = slide?.backgroundImage || '';
          const status = slide?.backgroundStatus || 'pending';
          const expanded = expandedPrompt === slot.id;

          return (
            <div key={slot.id} className={`rounded-xl border overflow-hidden ${slot.final ? 'bg-brand-orange/[0.03] border-brand-orange/20' : 'bg-white/[0.03] border-white/10'}`}>
              <div className="flex">
                <div className="flex-1 p-4 border-r border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider">{slot.label}</span>
                    {slot.final && <span className="text-[9px] bg-brand-orange/20 text-brand-orange px-1.5 py-0.5 rounded-full">FINAL</span>}
                  </div>
                  <p className="text-xs text-gray-400">{slot.desc}</p>
                  {slot.text && <p className="text-xs text-white mt-2 font-medium">"{slot.text}"</p>}
                  {slot.id === 'cta' && <p className="text-[10px] text-brand-orange mt-1">Keyword: {keyword || 'BUILD'}</p>}
                  {slot.id === 'middle' && middleSlides.length > 0 && (
                    <p className="text-[10px] text-gray-600 mt-1">Applied to slides {middleSlides.map((_, i) => i + 2).join(', ')}</p>
                  )}
                </div>

                <div className="w-44 flex-shrink-0 relative bg-black flex items-center justify-center" style={{ minHeight: 200 }}>
                  {imageUrl ? (
                    <img src={imageUrl} alt="" className="w-full h-full object-cover" style={{ aspectRatio: '3/4' }} />
                  ) : loading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-brand-orange" />
                      <span className="text-[10px] text-gray-500">{slot.final ? 'Rendering...' : 'Generating...'}</span>
                    </div>
                  ) : status === 'error' ? (
                    <span className="text-[10px] text-red-400 text-center px-2">Failed — click regenerate</span>
                  ) : (
                    <span className="text-[10px] text-gray-700">Pending</span>
                  )}
                </div>
              </div>

              <div className="border-t border-white/5 px-4 py-2 flex items-center gap-2">
                <button onClick={() => generateSlot(slot.id)} disabled={loading}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 disabled:opacity-40">
                  <RefreshCw size={11} /> {imageUrl ? 'Regenerate' : 'Generate'}
                </button>
                <button onClick={() => setExpandedPrompt(expanded ? null : slot.id)}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 ml-auto">
                  {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />} Edit prompt
                </button>
              </div>

              {expanded && (
                <div className="border-t border-white/5 px-4 py-3">
                  <textarea
                    value={localPrompts[slot.id] || getPrompt(slot.id)}
                    onChange={e => setLocalPrompts(p => ({ ...p, [slot.id]: e.target.value }))}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 leading-relaxed resize-none focus:outline-none focus:border-brand-orange/30 font-mono"
                    rows={6} />
                  <button onClick={() => generateSlot(slot.id)} disabled={loading}
                    className="mt-2 text-xs text-brand-orange hover:text-orange-400 flex items-center gap-1 disabled:opacity-40">
                    <RefreshCw size={11} /> Regenerate with edited prompt
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={() => { approve('backgrounds'); setStep(3); }}
        disabled={!allDone}
        className="w-full bg-green-500/20 hover:bg-green-500/30 disabled:opacity-30 border border-green-500/30 text-green-400 font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
        <Check size={14} /> Approve & Continue
      </button>
    </div>
  );
}

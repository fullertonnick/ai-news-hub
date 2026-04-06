'use client';
import { useCallback, useState, useMemo } from 'react';
import { useCarouselStore } from '../../stores/useCarouselStore';
import { Loader2, RefreshCw, Check, ChevronDown, ChevronUp, Image } from 'lucide-react';

// ─── Prompt builders ─────────────────────────────────────────────────────────
// Cover + CTA = FINISHED products with text rendered by Imagen
// Middle = background-only (text overlaid by React)

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
- A small downward arrow "↓" below the CTA line in orange.

BRANDING: Small "@thenickcornelius" bottom-left. Small "save for later" with bookmark icon bottom-right. Both subtle and small.

STYLE: Must look like a premium SaaS product page CTA section. Clean, modern, dark mode. Figma-quality design. Text must be perfectly crisp and readable. Same visual language as the content slides (grid background, orange accents).

CRITICAL: Render ALL text EXACTLY as specified. The keyword "${keyword}" must appear inside an orange rounded rectangle pill. Do not change any words. No faces, no people, no photographs.`;
}

const MIDDLE_PROMPT =
  'Abstract premium SaaS product hero background. Pure near-black (#0A0A0A) background with subtle isometric grid pattern in thin dark gray lines. Minimal geometric floating elements. Soft volumetric orange (#FF7107) and cyan gradient accent lights in the upper corners. Depth and atmosphere with very subtle particles. Clean, futuristic, enterprise software aesthetic like Linear, Vercel, or Raycast dashboards. Premium UI design inspiration. Ready for text overlay with plenty of negative space. Dark mode aesthetic. 8K ultra minimal. No text, no typography, no letters, no numbers, no UI elements, no icons, no faces, no people.';

interface BgSlot {
  id: 'cover' | 'middle' | 'cta';
  label: string;
  description: string;
  imageUrl: string;
  prompt: string;
  status: 'pending' | 'generating' | 'done' | 'error';
  loading: boolean;
}

export default function Step2Backgrounds() {
  const store = useCarouselStore();
  const { slides, keyword } = store;

  const coverSlide = slides[0];
  const ctaSlide = slides[slides.length - 1];
  const firstMiddle = slides[1];

  // Build dynamic prompts from actual slide text
  const coverPrompt = useMemo(
    () => coverSlide ? buildCoverPrompt(coverSlide.text) : '',
    [coverSlide?.text]
  );
  const ctaPrompt = useMemo(
    () => ctaSlide ? buildCTAPrompt(ctaSlide.text, keyword || 'BUILD') : '',
    [ctaSlide?.text, keyword]
  );

  const slots: BgSlot[] = useMemo(() => [
    {
      id: 'cover',
      label: 'Cover Slide (finished product)',
      description: 'Complete cover with headline rendered — no post-editing needed',
      imageUrl: coverSlide?.backgroundImage || '',
      prompt: coverSlide?.backgroundPrompt || coverPrompt,
      status: (coverSlide?.backgroundStatus as any) || 'pending',
      loading: coverSlide ? store.bgLoading[coverSlide.id] || false : false,
    },
    {
      id: 'middle',
      label: 'Content Slides (shared background)',
      description: `Premium grid background applied to all ${Math.max(0, slides.length - 2)} middle slides — text overlaid on top`,
      imageUrl: firstMiddle?.backgroundImage || '',
      prompt: firstMiddle?.backgroundPrompt || MIDDLE_PROMPT,
      status: (firstMiddle?.backgroundStatus as any) || 'pending',
      loading: firstMiddle ? store.bgLoading[firstMiddle.id] || false : false,
    },
    {
      id: 'cta',
      label: 'CTA Slide (finished product)',
      description: 'Complete CTA with keyword pill rendered — no post-editing needed',
      imageUrl: ctaSlide?.backgroundImage || '',
      prompt: ctaSlide?.backgroundPrompt || ctaPrompt,
      status: (ctaSlide?.backgroundStatus as any) || 'pending',
      loading: ctaSlide ? store.bgLoading[ctaSlide.id] || false : false,
    },
  ], [slides, coverSlide, ctaSlide, firstMiddle, coverPrompt, ctaPrompt, store.bgLoading]);

  const [expandedPrompt, setExpandedPrompt] = useState<'cover' | 'middle' | 'cta' | null>(null);

  const slideIdsForSlot = useCallback((slotId: 'cover' | 'middle' | 'cta'): string[] => {
    if (slotId === 'cover') return coverSlide ? [coverSlide.id] : [];
    if (slotId === 'cta') return ctaSlide ? [ctaSlide.id] : [];
    return slides.slice(1, -1).map(s => s.id);
  }, [slides, coverSlide, ctaSlide]);

  const getDefaultPrompt = useCallback((slotId: 'cover' | 'middle' | 'cta'): string => {
    if (slotId === 'cover') return coverPrompt;
    if (slotId === 'cta') return ctaPrompt;
    return MIDDLE_PROMPT;
  }, [coverPrompt, ctaPrompt]);

  const generateSlot = useCallback(async (slotId: 'cover' | 'middle' | 'cta', customPrompt?: string) => {
    const prompt = customPrompt || getDefaultPrompt(slotId);
    const slideIds = slideIdsForSlot(slotId);

    slideIds.forEach(id => {
      store.setBgLoading(id, true);
      store.setSlideBackgroundStatus(id, 'generating');
      store.setSlideBackgroundPrompt(id, prompt);
    });

    try {
      const r = await fetch('/api/imagen', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const d = await r.json();
      if (d.dataUrl) {
        slideIds.forEach(id => store.setSlideBackground(id, d.dataUrl));
      } else {
        console.error(`Imagen failed for ${slotId}:`, d);
        slideIds.forEach(id => store.setSlideBackgroundStatus(id, 'error'));
      }
    } catch (err) {
      console.error(`Imagen error for ${slotId}:`, err);
      slideIds.forEach(id => store.setSlideBackgroundStatus(id, 'error'));
    }

    slideIds.forEach(id => store.setBgLoading(id, false));
  }, [slideIdsForSlot, getDefaultPrompt, store]);

  const generateAll = useCallback(async () => {
    await Promise.all([
      generateSlot('cover'),
      generateSlot('middle'),
      generateSlot('cta'),
    ]);
  }, [generateSlot]);

  // Check actual slide data — not just the 3 slots
  const allDone = slides.every(s => s.backgroundStatus === 'done');
  const anyGenerating = slots.some(s => s.loading);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Generate Slides</h3>
          <p className="text-xs text-gray-500 mt-0.5">Cover and CTA are finished products with text rendered in. Middle slides share one premium background.</p>
        </div>
        <button onClick={generateAll} disabled={anyGenerating}
          className="flex items-center gap-1.5 bg-brand-orange hover:bg-orange-500 disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
          {anyGenerating ? <Loader2 size={14} className="animate-spin" /> : <Image size={14} />}
          {anyGenerating ? 'Generating...' : 'Generate All 3'}
        </button>
      </div>

      <div className="space-y-3">
        {slots.map(slot => {
          const expanded = expandedPrompt === slot.id;
          const isFinished = slot.id === 'cover' || slot.id === 'cta';
          return (
            <div key={slot.id} className={`rounded-xl border overflow-hidden ${isFinished ? 'bg-brand-orange/[0.03] border-brand-orange/20' : 'bg-white/[0.03] border-white/10'}`}>
              <div className="flex">
                <div className="flex-1 p-4 border-r border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider">{slot.label}</span>
                    {isFinished && <span className="text-[9px] bg-brand-orange/20 text-brand-orange px-1.5 py-0.5 rounded-full">FINAL</span>}
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{slot.description}</p>
                  {slot.id === 'cover' && coverSlide && (
                    <p className="text-xs text-white mt-2 font-medium">"{coverSlide.text}"</p>
                  )}
                  {slot.id === 'cta' && ctaSlide && (
                    <div className="mt-2">
                      <p className="text-xs text-white font-medium">"{ctaSlide.text}"</p>
                      <p className="text-[10px] text-brand-orange mt-1">Keyword: {keyword || 'BUILD'}</p>
                    </div>
                  )}
                  {slot.id === 'middle' && slides.length > 2 && (
                    <p className="text-[10px] text-gray-600 mt-1">
                      Applied to slides {slides.slice(1, -1).map((_, i) => i + 2).join(', ')}
                    </p>
                  )}
                </div>

                <div className="w-44 flex-shrink-0 relative bg-black flex items-center justify-center" style={{ minHeight: 200 }}>
                  {slot.imageUrl ? (
                    <img src={slot.imageUrl} alt="" className="w-full h-full object-cover" style={{ aspectRatio: '3/4' }} />
                  ) : slot.loading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-brand-orange" />
                      <span className="text-[10px] text-gray-500">{isFinished ? 'Rendering...' : 'Generating...'}</span>
                    </div>
                  ) : slot.status === 'error' ? (
                    <span className="text-[10px] text-red-400 text-center px-2">Failed — click regenerate</span>
                  ) : (
                    <span className="text-[10px] text-gray-700">Pending</span>
                  )}
                </div>
              </div>

              <div className="border-t border-white/5 px-4 py-2 flex items-center gap-2">
                <button onClick={() => generateSlot(slot.id)} disabled={slot.loading}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 disabled:opacity-40">
                  <RefreshCw size={11} />
                  {slot.imageUrl ? 'Regenerate' : 'Generate'}
                </button>
                <button onClick={() => setExpandedPrompt(expanded ? null : slot.id)}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 ml-auto">
                  {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />} Edit prompt
                </button>
              </div>

              {expanded && (
                <div className="border-t border-white/5 px-4 py-3">
                  <textarea
                    value={slot.prompt}
                    onChange={e => {
                      const slideIds = slideIdsForSlot(slot.id);
                      slideIds.forEach(id => store.setSlideBackgroundPrompt(id, e.target.value));
                    }}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 leading-relaxed resize-none focus:outline-none focus:border-brand-orange/30 font-mono"
                    rows={6} />
                  <button onClick={() => generateSlot(slot.id, slot.prompt)} disabled={slot.loading}
                    className="mt-2 text-xs text-brand-orange hover:text-orange-400 flex items-center gap-1 disabled:opacity-40">
                    <RefreshCw size={11} /> Regenerate with edited prompt
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={() => { store.approve('backgrounds'); store.setStep(3); }}
        disabled={!allDone}
        className="w-full bg-green-500/20 hover:bg-green-500/30 disabled:opacity-30 border border-green-500/30 text-green-400 font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
        <Check size={14} /> Approve & Continue
      </button>
    </div>
  );
}

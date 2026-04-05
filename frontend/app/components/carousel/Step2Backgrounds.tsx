'use client';
import { useCallback, useState, useMemo } from 'react';
import { useCarouselStore } from '../../stores/useCarouselStore';
import { Loader2, RefreshCw, Check, ChevronDown, ChevronUp, Image } from 'lucide-react';

// ─── Bulletproof prompts for the 3 background slots ─────────────────────────
// Cover: unique cinematic scene for the topic
// Middle: premium futuristic grid — SAME across all middle slides
// CTA: unique dramatic atmosphere

const COVER_PROMPT_BASE =
  'Cinematic photograph of a dark modern executive workspace at night. Ultrawide curved monitor with ambient blue and warm amber glow. Minimalist desk setup. Deep charcoal walls, shallow depth of field, soft bokeh. Volumetric light rays. Premium editorial tech photography. Studio lighting. High contrast. 8K hyperdetailed. Shot on ARRI Alexa, 35mm lens. No visible text anywhere, no faces, no people, no readable words on screens, no UI mockups.';

const MIDDLE_PROMPT =
  'Abstract premium SaaS product hero background. Pure near-black background with subtle isometric grid pattern in thin dark gray lines. Minimal geometric floating elements. Soft volumetric orange and cyan gradient accent lights in the upper corners. Depth and atmosphere with very subtle particles. Clean, futuristic, enterprise software aesthetic like Linear or Vercel dashboards. Premium UI design inspiration. Ready for text overlay with plenty of negative space. Dark mode aesthetic. 8K ultra minimal. No text, no typography, no letters, no numbers, no UI elements, no icons, no faces.';

const CTA_PROMPT =
  'Dramatic cinematic dark stage. Single intense warm orange spotlight beam from directly above illuminating center of frame. Deep black surrounding darkness with subtle volumetric fog. Premium theatrical atmosphere. High contrast light to shadow. Editorial commercial photography. Shot on Hasselblad. 8K ultra detailed. No text, no typography, no letters, no faces, no people, no objects in center.';

interface BgSlot {
  id: 'cover' | 'middle' | 'cta';
  label: string;
  description: string;
  basePrompt: string;
  imageUrl: string;
  prompt: string;
  status: 'pending' | 'generating' | 'done' | 'error';
  loading: boolean;
}

export default function Step2Backgrounds() {
  const store = useCarouselStore();
  const { slides, topic } = store;

  // Build cover prompt with topic context
  const coverPromptWithTopic = useMemo(
    () => `${COVER_PROMPT_BASE} Subtle visual nod to: ${topic.slice(0, 80)}.`,
    [topic]
  );

  // Derive the 3 slots from the slide data (which stores backgrounds per-slide)
  const coverSlide = slides[0];
  const ctaSlide = slides[slides.length - 1];
  const firstMiddle = slides[1];

  const slots: BgSlot[] = useMemo(() => [
    {
      id: 'cover',
      label: 'Cover Slide',
      description: 'Unique cinematic scene for slide 1',
      basePrompt: coverPromptWithTopic,
      imageUrl: coverSlide?.backgroundImage || '',
      prompt: coverSlide?.backgroundPrompt || coverPromptWithTopic,
      status: (coverSlide?.backgroundStatus as any) || 'pending',
      loading: coverSlide ? store.bgLoading[coverSlide.id] || false : false,
    },
    {
      id: 'middle',
      label: 'Content Slides (shared)',
      description: `Same premium background on all ${Math.max(0, slides.length - 2)} middle slides`,
      basePrompt: MIDDLE_PROMPT,
      imageUrl: firstMiddle?.backgroundImage || '',
      prompt: firstMiddle?.backgroundPrompt || MIDDLE_PROMPT,
      status: (firstMiddle?.backgroundStatus as any) || 'pending',
      loading: firstMiddle ? store.bgLoading[firstMiddle.id] || false : false,
    },
    {
      id: 'cta',
      label: 'CTA Slide',
      description: 'Dramatic spotlight for the final slide',
      basePrompt: CTA_PROMPT,
      imageUrl: ctaSlide?.backgroundImage || '',
      prompt: ctaSlide?.backgroundPrompt || CTA_PROMPT,
      status: (ctaSlide?.backgroundStatus as any) || 'pending',
      loading: ctaSlide ? store.bgLoading[ctaSlide.id] || false : false,
    },
  ], [slides, coverSlide, ctaSlide, firstMiddle, coverPromptWithTopic, store.bgLoading]);

  const [expandedPrompt, setExpandedPrompt] = useState<'cover' | 'middle' | 'cta' | null>(null);

  // Which slides get which background
  const slideIdsForSlot = useCallback((slotId: 'cover' | 'middle' | 'cta'): string[] => {
    if (slotId === 'cover') return coverSlide ? [coverSlide.id] : [];
    if (slotId === 'cta') return ctaSlide ? [ctaSlide.id] : [];
    // middle = all slides between first and last
    return slides.slice(1, -1).map(s => s.id);
  }, [slides, coverSlide, ctaSlide]);

  const generateSlot = useCallback(async (slotId: 'cover' | 'middle' | 'cta', customPrompt?: string) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return;
    const prompt = customPrompt || slot.prompt || slot.basePrompt;
    const slideIds = slideIdsForSlot(slotId);

    // Set loading + generating status for all affected slides
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
        // Apply the same image to all slides in this slot
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
  }, [slots, slideIdsForSlot, store]);

  const generateAll = useCallback(async () => {
    await Promise.all([
      generateSlot('cover'),
      generateSlot('middle'),
      generateSlot('cta'),
    ]);
  }, [generateSlot]);

  const allDone = slots.every(s => s.status === 'done');
  const anyGenerating = slots.some(s => s.loading);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Generate Backgrounds</h3>
          <p className="text-xs text-gray-500 mt-0.5">Only 3 backgrounds needed — cover, shared middle, and CTA. Middle slides all use the same premium background.</p>
        </div>
        <button onClick={generateAll} disabled={anyGenerating}
          className="flex items-center gap-1.5 bg-brand-orange hover:bg-orange-500 disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
          {anyGenerating ? <Loader2 size={14} className="animate-spin" /> : <Image size={14} />}
          {anyGenerating ? 'Generating...' : 'Generate All 3'}
        </button>
      </div>

      {/* 3 slot cards */}
      <div className="space-y-3">
        {slots.map(slot => {
          const expanded = expandedPrompt === slot.id;
          return (
            <div key={slot.id} className="rounded-xl bg-white/[0.03] border border-white/10 overflow-hidden">
              <div className="flex">
                <div className="flex-1 p-4 border-r border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider">{slot.label}</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{slot.description}</p>
                  {slot.id === 'middle' && slides.length > 2 && (
                    <p className="text-[10px] text-gray-600 mt-1">
                      Applied to slides {slides.slice(1, -1).map((_, i) => i + 2).join(', ')}
                    </p>
                  )}
                </div>

                <div className="w-40 flex-shrink-0 relative bg-black flex items-center justify-center" style={{ aspectRatio: '4/5' }}>
                  {slot.imageUrl ? (
                    <img src={slot.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : slot.loading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-brand-orange" />
                      <span className="text-[10px] text-gray-500">Generating...</span>
                    </div>
                  ) : slot.status === 'error' ? (
                    <span className="text-[10px] text-red-400 text-center px-2">Failed<br/>click regenerate</span>
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
                    rows={5} />
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
        <Check size={14} /> Approve Backgrounds & Continue to Cover
      </button>
    </div>
  );
}

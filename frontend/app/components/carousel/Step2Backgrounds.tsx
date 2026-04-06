'use client';
import { useState, useRef } from 'react';
import { useCarouselStore } from '../../stores/useCarouselStore';
import { Loader2, RefreshCw, Check, Image, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Default prompts ─────────────────────────────────────────────────────────

function coverPrompt(headline: string): string {
  return `Professional Instagram carousel cover slide, portrait 3:4 aspect ratio. A confident male entrepreneur in a dark professional setting, subtle moody lighting. Heavy dark overlay making the photo very dark. The text "${headline}" in massive bold white modern sans-serif font, positioned in the lower third, left-aligned. One keyword in orange #FF7107. Small @thenickcornelius bottom-left corner, small bookmark icon with "save for later" bottom-right corner. Cinematic, editorial, premium. Text must be crisp and readable.`;
}

const MIDDLE_PROMPT = `Clean minimal dark background for Instagram carousel content slide. Very dark near-black base color #0C0C0C. Extremely subtle fine dot grid pattern barely visible at 5-8% opacity. No gradients, no glowing elements, no particles, no shapes, no 3D objects. Just a refined dark textured surface. Think premium dark mode UI background — like Notion, Linear, or Vercel in dark mode. Must have plenty of negative space for white text overlay. Ultra clean, ultra minimal. No text, no icons, no faces, no logos.`;

function ctaPrompt(ctaText: string, keyword: string): string {
  return `Instagram carousel CTA slide, portrait 3:4. Very dark near-black background matching previous slides. The text "${ctaText}" centered in bold white sans-serif font. Below it a thin orange line, then "Comment ${keyword} and I'll send it over" with ${keyword} inside an orange rounded badge. Small @thenickcornelius bottom-left, save for later bottom-right. Minimal, clean, dark mode. Text crisp and readable. No photos, no complexity.`;
}

type SlotId = 'cover' | 'middle' | 'cta';

interface SlotState {
  status: 'idle' | 'generating' | 'done' | 'error';
  imageUrl: string;
  prompt: string;
}

export default function Step2Backgrounds() {
  const slides = useCarouselStore(s => s.slides);
  const keyword = useCarouselStore(s => s.keyword);
  const setSlideBackground = useCarouselStore(s => s.setSlideBackground);
  const setSlideBackgroundStatus = useCarouselStore(s => s.setSlideBackgroundStatus);
  const setSlideBackgroundPrompt = useCarouselStore(s => s.setSlideBackgroundPrompt);
  const approve = useCarouselStore(s => s.approve);
  const setStep = useCarouselStore(s => s.setStep);

  const coverSlide = slides[0];
  const ctaSlide = slides[slides.length - 1];
  const middleSlides = slides.slice(1, -1);

  const defaultPrompts: Record<SlotId, string> = {
    cover: coverPrompt(coverSlide?.text || ''),
    middle: MIDDLE_PROMPT,
    cta: ctaPrompt(ctaSlide?.text || '', keyword || 'BUILD'),
  };

  const [slots, setSlots] = useState<Record<SlotId, SlotState>>({
    cover: { status: 'idle', imageUrl: '', prompt: defaultPrompts.cover },
    middle: { status: 'idle', imageUrl: '', prompt: defaultPrompts.middle },
    cta: { status: 'idle', imageUrl: '', prompt: defaultPrompts.cta },
  });
  const [expandedPrompt, setExpandedPrompt] = useState<SlotId | null>(null);
  const busyRef = useRef<Set<SlotId>>(new Set());

  const updateSlot = (id: SlotId, update: Partial<SlotState>) => {
    setSlots(prev => ({ ...prev, [id]: { ...prev[id], ...update } }));
  };

  const generateSlot = async (slotId: SlotId) => {
    if (busyRef.current.has(slotId)) return;
    busyRef.current.add(slotId);
    updateSlot(slotId, { status: 'generating' });

    const prompt = slots[slotId].prompt || defaultPrompts[slotId];

    try {
      const r = await fetch('/api/imagen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const d = await r.json();

      if (d.dataUrl) {
        updateSlot(slotId, { status: 'done', imageUrl: d.dataUrl });
        // Write to zustand store
        const slideIds = slotId === 'cover' ? [coverSlide?.id].filter(Boolean)
          : slotId === 'cta' ? [ctaSlide?.id].filter(Boolean)
          : middleSlides.map(s => s.id);
        slideIds.forEach(id => {
          if (id) {
            setSlideBackground(id, d.dataUrl);
            setSlideBackgroundPrompt(id, prompt);
          }
        });
      } else {
        updateSlot(slotId, { status: 'error' });
      }
    } catch {
      updateSlot(slotId, { status: 'error' });
    }

    busyRef.current.delete(slotId);
  };

  const generateAll = async () => {
    await Promise.allSettled([
      generateSlot('cover'),
      generateSlot('middle'),
      generateSlot('cta'),
    ]);
  };

  const anyGenerating = Object.values(slots).some(s => s.status === 'generating');
  const allDone = Object.values(slots).every(s => s.status === 'done');

  const SLOT_CONFIG: { id: SlotId; label: string; desc: string; slideText?: string }[] = [
    { id: 'cover', label: 'Cover Slide', desc: 'Photo + dark overlay + headline — finished product', slideText: coverSlide?.text },
    { id: 'middle', label: 'Content Background', desc: `Minimal dark surface shared across ${middleSlides.length} slides` },
    { id: 'cta', label: 'CTA Slide', desc: 'Comment keyword mechanic — finished product', slideText: ctaSlide?.text },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Generate Backgrounds</h3>
          <p className="text-xs text-gray-500 mt-0.5">Powered by Nano Banana Pro. All 3 generate in parallel.</p>
        </div>
        <button onClick={generateAll} disabled={anyGenerating}
          className="flex items-center gap-1.5 bg-brand-orange hover:bg-orange-500 disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
          {anyGenerating ? <Loader2 size={14} className="animate-spin" /> : <Image size={14} />}
          {anyGenerating ? 'Generating...' : 'Generate All 3'}
        </button>
      </div>

      <div className="space-y-3">
        {SLOT_CONFIG.map(cfg => {
          const slot = slots[cfg.id];
          const expanded = expandedPrompt === cfg.id;
          const isFinal = cfg.id !== 'middle';

          return (
            <div key={cfg.id} className={`rounded-xl border overflow-hidden ${isFinal ? 'bg-brand-orange/[0.03] border-brand-orange/20' : 'bg-white/[0.03] border-white/10'}`}>
              <div className="flex">
                {/* Info */}
                <div className="flex-1 p-4 border-r border-white/5 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider">{cfg.label}</span>
                    {isFinal && <span className="text-[9px] bg-brand-orange/20 text-brand-orange px-1.5 py-0.5 rounded-full">FINAL</span>}
                  </div>
                  <p className="text-xs text-gray-400">{cfg.desc}</p>
                  {cfg.slideText && <p className="text-xs text-white font-medium mt-2 truncate">"{cfg.slideText}"</p>}
                  {cfg.id === 'cta' && <p className="text-[10px] text-brand-orange mt-1">Keyword: {keyword || 'BUILD'}</p>}
                </div>

                {/* Preview */}
                <div className="w-36 flex-shrink-0 bg-[#0A0A0A] flex items-center justify-center" style={{ minHeight: 180 }}>
                  {slot.imageUrl ? (
                    <img src={slot.imageUrl} alt="" className="w-full h-full object-cover" style={{ aspectRatio: '3/4' }} />
                  ) : slot.status === 'generating' ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-brand-orange" />
                      <span className="text-[10px] text-gray-500">~8-15s</span>
                    </div>
                  ) : slot.status === 'error' ? (
                    <button onClick={() => generateSlot(cfg.id)} className="text-[10px] text-red-400 hover:text-red-300 text-center px-2">
                      Failed — tap to retry
                    </button>
                  ) : (
                    <span className="text-[10px] text-gray-700">Pending</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-white/5 px-4 py-2 flex items-center gap-3">
                <button onClick={() => generateSlot(cfg.id)} disabled={slot.status === 'generating'}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 disabled:opacity-40">
                  <RefreshCw size={11} /> {slot.imageUrl ? 'Regenerate' : 'Generate'}
                </button>
                <button onClick={() => setExpandedPrompt(expanded ? null : cfg.id)}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 ml-auto">
                  {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />} Prompt
                </button>
              </div>

              {/* Editable prompt */}
              {expanded && (
                <div className="border-t border-white/5 px-4 py-3">
                  <textarea
                    value={slot.prompt}
                    onChange={e => updateSlot(cfg.id, { prompt: e.target.value })}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 leading-relaxed resize-none focus:outline-none focus:border-brand-orange/30 font-mono"
                    rows={6} />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => generateSlot(cfg.id)} disabled={slot.status === 'generating'}
                      className="text-xs text-brand-orange hover:text-orange-400 flex items-center gap-1 disabled:opacity-40">
                      <RefreshCw size={11} /> Regenerate with edited prompt
                    </button>
                    <button onClick={() => updateSlot(cfg.id, { prompt: defaultPrompts[cfg.id] })}
                      className="text-xs text-gray-500 hover:text-white ml-auto">
                      Reset to default
                    </button>
                  </div>
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

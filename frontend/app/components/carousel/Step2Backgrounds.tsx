'use client';
import { useCallback, useState, useRef, useEffect } from 'react';
import { useCarouselStore } from '../../stores/useCarouselStore';
import { Loader2, RefreshCw, Check, ChevronDown, ChevronUp, Image, Upload } from 'lucide-react';

// ─── Middle slide: dead simple, Tyler Germain style ──────────────────────────
// Pure near-black with VERY subtle texture. Nothing distracting. Text-first.

const MIDDLE_PROMPT =
  'Solid near-black background with extremely subtle dark charcoal noise texture. Almost imperceptible fine grain. Pure dark mode. Completely minimal. No patterns, no grid, no shapes, no gradients, no lights, no particles, no geometric elements. Just a clean, professional dark surface. Perfect for white text overlay. 8K. No text, no faces, no icons.';

// ─── Cover + CTA: Nick's photo with dark overlay + text from Imagen ──────────
// When photos are available, we use those. Otherwise Imagen generates the scene.

function buildCoverPrompt(headline: string): string {
  return `Instagram carousel cover slide. Portrait 3:4 ratio. Premium dark design.

DESIGN: Full-bleed photograph of a confident male entrepreneur at a desk or professional setting. The photo should have a heavy dark overlay (60-70% opacity black).

TEXT: The headline "${headline}" must be rendered in massive bold white sans-serif font (Inter Black or similar). Text positioned in the lower-third, left-aligned. The headline is the hero — massive, impactful, filling 60%+ width. Each line stacked vertically.

ACCENT: One key word from the headline should be in orange (#FF7107) instead of white.

BRANDING: Very small "@thenickcornelius" bottom-left, "🔖 save for later" bottom-right. Subtle, not distracting.

STYLE: Dark, cinematic, editorial. Like a premium tech conference keynote slide. Think Apple event aesthetics meets Instagram carousel. Crisp text, moody photo underneath.

CRITICAL: Text must be perfectly legible and the focal point. No clutter.`;
}

function buildCTAPrompt(ctaText: string, keyword: string): string {
  return `Instagram carousel CTA slide. Portrait 3:4 ratio. Premium dark design.

DESIGN: Dark background matching the carousel's content slides — near-black, minimal, clean.

TEXT LAYOUT (centered vertically):
- "${ctaText}" in bold white sans-serif, medium-large, centered
- Small orange (#FF7107) horizontal line divider below
- "Comment" in white + "${keyword}" in a solid orange rounded pill badge with black text + "I'll send it over" in white — all on one line, centered
- Small orange "↓" arrow below

BRANDING: Small "@thenickcornelius" bottom-left, "🔖 save for later" bottom-right.

STYLE: Clean, minimal, dark mode. Same visual language as content slides — simple dark background, white text, orange accents. Like a premium SaaS CTA section. No photos, no complexity.

CRITICAL: All text must be perfectly crisp and readable. Render text EXACTLY as specified.`;
}

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
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string>('');
  const generatingRef = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const coverSlide = slides[0];
  const ctaSlide = slides[slides.length - 1];
  const middleSlides = slides.slice(1, -1);

  // Check for available nick photos
  const [availablePhotos, setAvailablePhotos] = useState<string[]>([]);
  useEffect(() => {
    // Check if nick-photos directory has files
    fetch('/nick-photos/')
      .then(() => setAvailablePhotos(['/nick.jpg'])) // Fallback to nick.jpg
      .catch(() => setAvailablePhotos(['/nick.jpg']));
  }, []);

  // Handle photo upload for cover
  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCoverPhotoUrl(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const generateSlot = useCallback(async (slotId: 'cover' | 'middle' | 'cta') => {
    if (generatingRef.current.has(slotId)) return;
    generatingRef.current.add(slotId);

    const slideIds = slotId === 'cover' ? (coverSlide ? [coverSlide.id] : [])
      : slotId === 'cta' ? (ctaSlide ? [ctaSlide.id] : [])
      : middleSlides.map(s => s.id);

    let prompt: string;
    if (slotId === 'cover') prompt = localPrompts.cover || buildCoverPrompt(coverSlide?.text || '');
    else if (slotId === 'cta') prompt = localPrompts.cta || buildCTAPrompt(ctaSlide?.text || '', keyword || 'BUILD');
    else prompt = localPrompts.middle || MIDDLE_PROMPT;

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
  }, [coverSlide, ctaSlide, middleSlides, localPrompts, keyword, setBgLoading, setSlideBackground, setSlideBackgroundStatus, setSlideBackgroundPrompt]);

  const generateAll = useCallback(async () => {
    await Promise.all([generateSlot('cover'), generateSlot('middle'), generateSlot('cta')]);
  }, [generateSlot]);

  const allDone = slides.every(s => s.backgroundStatus === 'done');
  const anyLoading = Object.values(bgLoading).some(Boolean);

  const slotsConfig = [
    { id: 'cover' as const, label: 'Cover Slide', final: true },
    { id: 'middle' as const, label: 'Content Background', final: false },
    { id: 'cta' as const, label: 'CTA Slide', final: true },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Generate Visuals</h3>
          <p className="text-xs text-gray-500 mt-0.5">Cover + CTA = finished slides. Content background = minimal dark surface for text.</p>
        </div>
        <button onClick={generateAll} disabled={anyLoading}
          className="flex items-center gap-1.5 bg-brand-orange hover:bg-orange-500 disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
          {anyLoading ? <Loader2 size={14} className="animate-spin" /> : <Image size={14} />}
          {anyLoading ? 'Generating...' : 'Generate All 3'}
        </button>
      </div>

      <div className="space-y-3">
        {slotsConfig.map(slot => {
          const slide = slot.id === 'cover' ? coverSlide : slot.id === 'cta' ? ctaSlide : middleSlides[0];
          const loading = slide ? bgLoading[slide.id] || false : false;
          const imageUrl = slide?.backgroundImage || '';
          const status = slide?.backgroundStatus || 'pending';
          const expanded = expandedPrompt === slot.id;

          return (
            <div key={slot.id} className={`rounded-xl border overflow-hidden ${slot.final ? 'bg-brand-orange/[0.03] border-brand-orange/20' : 'bg-white/[0.03] border-white/10'}`}>
              <div className="flex">
                <div className="flex-1 p-4 border-r border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider">{slot.label}</span>
                    {slot.final && <span className="text-[9px] bg-brand-orange/20 text-brand-orange px-1.5 py-0.5 rounded-full">FINAL</span>}
                  </div>

                  {slot.id === 'cover' && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400">Finished cover with your photo + dark overlay + headline text.</p>
                      <p className="text-xs text-white font-medium">"{coverSlide?.text}"</p>
                      {/* Photo upload for cover */}
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => fileInputRef.current?.click()}
                          className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded border border-white/10 hover:border-white/20 transition-colors">
                          <Upload size={10} /> Upload your photo
                        </button>
                        {coverPhotoUrl && <span className="text-[10px] text-green-400">Photo loaded</span>}
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                      </div>
                    </div>
                  )}

                  {slot.id === 'middle' && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400">Clean dark surface — no distractions, text-first.</p>
                      <p className="text-[10px] text-gray-600">Applied to slides {middleSlides.map((_, i) => i + 2).join(', ')}</p>
                    </div>
                  )}

                  {slot.id === 'cta' && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400">Finished CTA with comment keyword mechanic.</p>
                      <p className="text-xs text-white font-medium">"{ctaSlide?.text}"</p>
                      <p className="text-[10px] text-brand-orange">Keyword: {keyword || 'BUILD'}</p>
                    </div>
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
                    value={localPrompts[slot.id] || (slot.id === 'cover' ? buildCoverPrompt(coverSlide?.text || '') : slot.id === 'cta' ? buildCTAPrompt(ctaSlide?.text || '', keyword || 'BUILD') : MIDDLE_PROMPT)}
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

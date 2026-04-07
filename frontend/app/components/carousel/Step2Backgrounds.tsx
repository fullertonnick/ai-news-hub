'use client';
import { useState, useRef, useCallback } from 'react';
import { useCarouselStore } from '../../stores/useCarouselStore';
import { Loader2, RefreshCw, Check, Image, ChevronDown, ChevronUp, Upload } from 'lucide-react';

// ─── Middle slide prompt (only slot that needs Nano Banana) ──────────────────

const MIDDLE_PROMPT = `Clean minimal dark background for an Instagram carousel slide. Very dark base #0C0C0C. Extremely subtle fine textured surface — think premium brushed dark metal or matte carbon fiber at very low contrast. Barely visible geometric accent in one corner — a thin angular line or small triangular shape in very dark gray. Premium, refined, understated. Think high-end product packaging or luxury brand website background in dark mode. Must have maximum negative space for white text overlay. Ultra clean. No text, no icons, no faces, no logos, no patterns, no grids, no particles, no gradients, no glowing elements.`;

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
  const setSlideBackgroundPrompt = useCarouselStore(s => s.setSlideBackgroundPrompt);
  const approve = useCarouselStore(s => s.approve);
  const setStep = useCarouselStore(s => s.setStep);

  const coverSlide = slides[0];
  const ctaSlide = slides[slides.length - 1];
  const middleSlides = slides.slice(1, -1);

  // Cover and CTA use uploaded photos — not Imagen
  const [coverPhoto, setCoverPhoto] = useState<string>('');
  const [ctaPhoto, setCtaPhoto] = useState<string>('');
  const coverInputRef = useRef<HTMLInputElement>(null);
  const ctaInputRef = useRef<HTMLInputElement>(null);

  // Middle slot — Nano Banana generated
  const [middleSlot, setMiddleSlot] = useState<SlotState>({ status: 'idle', imageUrl: '', prompt: MIDDLE_PROMPT });
  const [expandedPrompt, setExpandedPrompt] = useState(false);
  const busyRef = useRef(false);

  const handlePhotoUpload = useCallback((target: 'cover' | 'cta', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (target === 'cover') {
        setCoverPhoto(dataUrl);
        // Store the photo as background — SlideRenderer will add dark overlay + text
        if (coverSlide) {
          setSlideBackground(coverSlide.id, dataUrl);
          setSlideBackgroundPrompt(coverSlide.id, 'Uploaded photo with dark overlay');
        }
      } else {
        setCtaPhoto(dataUrl);
        if (ctaSlide) {
          setSlideBackground(ctaSlide.id, dataUrl);
          setSlideBackgroundPrompt(ctaSlide.id, 'Uploaded photo with dark overlay');
        }
      }
    };
    reader.readAsDataURL(file);
  }, [coverSlide, ctaSlide, setSlideBackground, setSlideBackgroundPrompt]);

  const generateMiddle = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setMiddleSlot(prev => ({ ...prev, status: 'generating' }));

    try {
      const r = await fetch('/api/imagen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: middleSlot.prompt }),
      });
      const d = await r.json();
      if (d.dataUrl) {
        setMiddleSlot(prev => ({ ...prev, status: 'done', imageUrl: d.dataUrl }));
        // Apply to all middle slides
        middleSlides.forEach(s => {
          setSlideBackground(s.id, d.dataUrl);
          setSlideBackgroundPrompt(s.id, middleSlot.prompt);
        });
      } else {
        setMiddleSlot(prev => ({ ...prev, status: 'error' }));
      }
    } catch {
      setMiddleSlot(prev => ({ ...prev, status: 'error' }));
    }
    busyRef.current = false;
  }, [middleSlot.prompt, middleSlides, setSlideBackground, setSlideBackgroundPrompt]);

  const coverReady = !!coverPhoto;
  const ctaReady = !!ctaPhoto;
  const middleReady = middleSlot.status === 'done';
  const allReady = coverReady && middleReady && ctaReady;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h3 className="text-sm font-bold text-white">Set Up Visuals</h3>
        <p className="text-xs text-gray-500 mt-1">Upload your photo for cover and CTA (dark overlay + text + stickers added automatically). Generate the content slide background.</p>
      </div>

      {/* ── COVER: Photo upload ────────────────────────────────────── */}
      <div className="rounded-xl border border-brand-orange/20 bg-brand-orange/[0.03] overflow-hidden">
        <div className="flex">
          <div className="flex-1 p-4 border-r border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider">Cover Slide</span>
              <span className="text-[9px] bg-brand-orange/20 text-brand-orange px-1.5 py-0.5 rounded-full">YOUR PHOTO</span>
            </div>
            <p className="text-xs text-gray-400">Upload a photo of yourself. A dark overlay, headline text, and relevant sticker-style icons (tool logos, tech icons) will be layered on top automatically.</p>
            {coverSlide && <p className="text-xs text-white font-medium mt-2 truncate">"{coverSlide.text}"</p>}
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload('cover', e)} />
            <button onClick={() => coverInputRef.current?.click()}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-white bg-brand-orange/20 hover:bg-brand-orange/30 border border-brand-orange/30 px-3 py-2 rounded-lg transition-colors">
              <Upload size={12} /> {coverPhoto ? 'Change Photo' : 'Upload Photo'}
            </button>
          </div>
          <div className="w-36 flex-shrink-0 bg-[#0A0A0A] flex items-center justify-center" style={{ minHeight: 180 }}>
            {coverPhoto ? (
              <div className="w-full h-full relative" style={{ aspectRatio: '3/4' }}>
                <img src={coverPhoto} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-[8px] text-white font-bold leading-tight">{coverSlide?.text?.slice(0, 40)}</p>
                </div>
              </div>
            ) : (
              <span className="text-[10px] text-gray-700 text-center px-2">Upload a photo</span>
            )}
          </div>
        </div>
      </div>

      {/* ── MIDDLE: Nano Banana generated ──────────────────────────── */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="flex">
          <div className="flex-1 p-4 border-r border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider">Content Background</span>
            </div>
            <p className="text-xs text-gray-400">Premium dark surface shared across {middleSlides.length} content slides. Text overlaid on top.</p>
          </div>
          <div className="w-36 flex-shrink-0 bg-[#0A0A0A] flex items-center justify-center" style={{ minHeight: 180 }}>
            {middleSlot.imageUrl ? (
              <img src={middleSlot.imageUrl} alt="" className="w-full h-full object-cover" style={{ aspectRatio: '3/4' }} />
            ) : middleSlot.status === 'generating' ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={16} className="animate-spin text-brand-orange" />
                <span className="text-[10px] text-gray-500">~8-15s</span>
              </div>
            ) : middleSlot.status === 'error' ? (
              <button onClick={generateMiddle} className="text-[10px] text-red-400 hover:text-red-300 px-2 text-center">Failed - tap to retry</button>
            ) : (
              <span className="text-[10px] text-gray-700">Click generate</span>
            )}
          </div>
        </div>
        <div className="border-t border-white/5 px-4 py-2 flex items-center gap-3">
          <button onClick={generateMiddle} disabled={middleSlot.status === 'generating'}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 disabled:opacity-40">
            {middleSlot.status === 'generating' ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            {middleSlot.imageUrl ? 'Regenerate' : 'Generate'}
          </button>
          <button onClick={() => setExpandedPrompt(!expandedPrompt)}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 ml-auto">
            {expandedPrompt ? <ChevronUp size={11} /> : <ChevronDown size={11} />} Prompt
          </button>
        </div>
        {expandedPrompt && (
          <div className="border-t border-white/5 px-4 py-3">
            <textarea value={middleSlot.prompt} onChange={e => setMiddleSlot(prev => ({ ...prev, prompt: e.target.value }))}
              className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 leading-relaxed resize-none focus:outline-none focus:border-brand-orange/30 font-mono" rows={5} />
            <div className="flex gap-2 mt-2">
              <button onClick={generateMiddle} disabled={middleSlot.status === 'generating'}
                className="text-xs text-brand-orange hover:text-orange-400 flex items-center gap-1 disabled:opacity-40">
                <RefreshCw size={11} /> Regenerate
              </button>
              <button onClick={() => setMiddleSlot(prev => ({ ...prev, prompt: MIDDLE_PROMPT }))}
                className="text-xs text-gray-500 hover:text-white ml-auto">Reset</button>
            </div>
          </div>
        )}
      </div>

      {/* ── CTA: Photo upload ──────────────────────────────────────── */}
      <div className="rounded-xl border border-brand-orange/20 bg-brand-orange/[0.03] overflow-hidden">
        <div className="flex">
          <div className="flex-1 p-4 border-r border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider">CTA Slide</span>
              <span className="text-[9px] bg-brand-orange/20 text-brand-orange px-1.5 py-0.5 rounded-full">YOUR PHOTO</span>
            </div>
            <p className="text-xs text-gray-400">Upload a photo. Dark overlay + CTA text + keyword pill layered on top.</p>
            {ctaSlide && <p className="text-xs text-white font-medium mt-2 truncate">"{ctaSlide.text}"</p>}
            <p className="text-[10px] text-brand-orange mt-1">Keyword: {keyword || 'BUILD'}</p>
            <input ref={ctaInputRef} type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload('cta', e)} />
            <button onClick={() => ctaInputRef.current?.click()}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-white bg-brand-orange/20 hover:bg-brand-orange/30 border border-brand-orange/30 px-3 py-2 rounded-lg transition-colors">
              <Upload size={12} /> {ctaPhoto ? 'Change Photo' : 'Upload Photo'}
            </button>
          </div>
          <div className="w-36 flex-shrink-0 bg-[#0A0A0A] flex items-center justify-center" style={{ minHeight: 180 }}>
            {ctaPhoto ? (
              <div className="w-full h-full relative" style={{ aspectRatio: '3/4' }}>
                <img src={ctaPhoto} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-[8px] text-white font-bold">{ctaSlide?.text?.slice(0, 40)}</p>
                  <span className="inline-block mt-1 text-[6px] bg-orange-500 text-black font-bold px-1.5 py-0.5 rounded">{keyword || 'BUILD'}</span>
                </div>
              </div>
            ) : (
              <span className="text-[10px] text-gray-700 text-center px-2">Upload a photo</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Status + Approve ───────────────────────────────────────── */}
      {(!coverReady || !ctaReady || !middleReady) && (
        <div className="text-xs text-gray-500 space-y-1">
          {!coverReady && <p>Upload a cover photo to continue</p>}
          {!middleReady && <p>Generate the content background to continue</p>}
          {!ctaReady && <p>Upload a CTA photo to continue</p>}
        </div>
      )}

      <button onClick={() => { approve('backgrounds'); setStep(3); }}
        disabled={!allReady}
        className="w-full bg-green-500/20 hover:bg-green-500/30 disabled:opacity-30 border border-green-500/30 text-green-400 font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
        <Check size={14} /> Approve and Continue
      </button>
    </div>
  );
}

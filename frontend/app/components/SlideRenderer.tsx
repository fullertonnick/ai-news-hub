'use client';
import React, { forwardRef } from 'react';
import { Brand } from '../brand/simpliscale';
import type {
  CarouselSlide, CodeBlockVisual, StatsGridVisual, DiagramVisual,
  StepsListVisual, CoverPhotoVisual, SkillCardVisual, CTASlideVisual,
  BigQuoteVisual, ComparisonVisual, ChecklistVisual, TextOverlay,
} from '../types';

interface Props {
  slide: CarouselSlide;
  slideNumber: number;
  totalSlides: number;
  forExport?: boolean;
}

// ─── Text Helpers ─────────────────────────────────────────────────────────────

function renderWithAccent(text: string, accentWord?: string, baseStyle?: React.CSSProperties): React.ReactNode {
  if (!accentWord || !text.toLowerCase().includes(accentWord.toLowerCase())) {
    return <span style={baseStyle}>{text}</span>;
  }
  const escaped = accentWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === accentWord.toLowerCase()
          ? <span key={i} style={{ ...baseStyle, color: Brand.colors.accent_primary }}>{part}</span>
          : <span key={i} style={baseStyle}>{part}</span>
      )}
    </>
  );
}

// ─── Code Syntax Highlighter ──────────────────────────────────────────────────

function highlightCode(code: string, highlights: string[] = [], sc: number): React.ReactNode[] {
  return code.split('\n').map((line, li) => {
    const tokens: React.ReactNode[] = [];
    let rem = line, ti = 0;
    while (rem.length > 0) {
      if (highlights.length) {
        const hl = highlights.find(h => rem.toLowerCase().startsWith(h.toLowerCase()));
        if (hl) {
          tokens.push(<span key={ti++} style={{ color: Brand.colors.accent_primary }}>{rem.slice(0, hl.length)}</span>);
          rem = rem.slice(hl.length); continue;
        }
      }
      const comment = rem.match(/^(\/\/.*|#.*)/);
      if (comment) { tokens.push(<span key={ti++} style={{ color: '#6B7280' }}>{comment[0]}</span>); rem = rem.slice(comment[0].length); continue; }
      const str = rem.match(/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/);
      if (str) { tokens.push(<span key={ti++} style={{ color: '#A8FF78' }}>{str[0]}</span>); rem = rem.slice(str[0].length); continue; }
      const kws = ['const', 'let', 'var', 'function', 'async', 'await', 'return', 'import', 'from', 'export', 'default', 'if', 'else', 'for', 'while', 'class', 'new', 'def', 'with', 'as', 'in', 'True', 'False', 'None', 'print', 'pass', 'raise', 'Send', 'Use', 'Task', 'Goal', 'Output', 'Context', 'Format', 'My', 'Give'];
      const kw = rem.match(new RegExp(`^(${kws.join('|')})(?=\\s|\\(|:|$|,|\\))`));
      if (kw) { tokens.push(<span key={ti++} style={{ color: Brand.colors.accent_primary }}>{kw[0]}</span>); rem = rem.slice(kw[0].length); continue; }
      const type = rem.match(/^([A-Z][a-zA-Z0-9_]*)/);
      if (type) { tokens.push(<span key={ti++} style={{ color: '#79B8FF' }}>{type[0]}</span>); rem = rem.slice(type[0].length); continue; }
      const num = rem.match(/^(\d+\.?\d*)/);
      if (num) { tokens.push(<span key={ti++} style={{ color: '#B8FF79' }}>{num[0]}</span>); rem = rem.slice(num[0].length); continue; }
      tokens.push(<span key={ti++} style={{ color: Brand.colors.text_primary }}>{rem[0]}</span>); rem = rem.slice(1);
    }
    return (
      <div key={li} style={{ display: 'flex', minHeight: '1.5em' }}>
        <span style={{ color: '#4B5563', userSelect: 'none', marginRight: `${16 * sc}px`, minWidth: `${28 * sc}px`, textAlign: 'right', flexShrink: 0, fontSize: `${12 * sc}px` }}>{li + 1}</span>
        <span style={{ flex: 1 }}>{tokens.length > 0 ? tokens : <span>&nbsp;</span>}</span>
      </div>
    );
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ label, sc }: { label: string; sc: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: `${8 * sc}px`, flexShrink: 0 }}>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.12)' }} />
      <span style={{
        color: Brand.colors.text_muted, fontSize: `${13 * sc}px`, fontWeight: 600,
        letterSpacing: '0.10em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const,
        fontFamily: Brand.typography.font_family,
      }}>{label}</span>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.12)' }} />
    </div>
  );
}

function Footer({ sc, light = false }: { sc: number; light?: boolean }) {
  const color = light ? 'rgba(255,255,255,0.7)' : Brand.colors.text_muted;
  const border = light ? '1px solid rgba(255,255,255,0.15)' : `1px solid ${Brand.colors.divider}`;
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      flexShrink: 0, paddingTop: `${12 * sc}px`, borderTop: border,
    }}>
      <span style={{ color, fontSize: `${12 * sc}px`, fontWeight: 500, fontFamily: Brand.typography.font_family }}>@thenickcornelius</span>
      <span style={{ color, fontSize: `${12 * sc}px`, fontWeight: 500, fontFamily: Brand.typography.font_family }}>{Brand.brand.save_cta}</span>
    </div>
  );
}

// ─── Overlay renderer (stickers + text overlays) — used by all slide types ───

function RenderOverlays({ slide, W, H }: { slide: CarouselSlide; W: number; H: number }) {
  const stickers = slide.stickers || [];
  const textOverlays: TextOverlay[] = slide.textOverlays || [];
  if (!stickers.length && !textOverlays.length) return null;
  return (
    <>
      {stickers.map(s => {
        const pxW = (s.width / 100) * W;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={s.id}
            src={s.src}
            alt={s.label}
            crossOrigin="anonymous"
            style={{
              position: 'absolute',
              left: `${(s.x / 100) * W}px`,
              top: `${(s.y / 100) * H}px`,
              width: `${pxW}px`,
              transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
              opacity: s.opacity,
              zIndex: s.zIndex ?? 10,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        );
      })}
      {textOverlays.map(t => {
        const pxW = (t.maxWidth / 100) * W;
        const fs = t.fontSize * (W / 1080);
        return (
          <div
            key={t.id}
            style={{
              position: 'absolute',
              left: `${(t.x / 100) * W}px`,
              top: `${(t.y / 100) * H}px`,
              width: `${pxW}px`,
              transform: `translate(-50%, -50%)${t.rotation ? ` rotate(${t.rotation}deg)` : ''}`,
              color: t.color,
              fontSize: `${fs}px`,
              fontWeight: t.fontWeight,
              fontFamily: t.fontFamily || Brand.typography.font_family,
              textAlign: 'center',
              lineHeight: 1.3,
              wordBreak: 'break-word',
              zIndex: t.zIndex ?? 10,
              pointerEvents: 'none',
              userSelect: 'none' as const,
              textShadow: '0 2px 8px rgba(0,0,0,0.7)',
            }}
          >
            {t.text}
          </div>
        );
      })}
    </>
  );
}

// ─── Cover Template — full-bleed photo, floating topic badges ────────────────

// Generate topic-relevant sticker labels from slide text.
// headlinePosition controls where the headline sits so badges don't overlap it:
//   'top'    → headline at 10%, so badges go in the lower-middle zone (42-55%)
//   'middle' → headline at 35%, badges stay in the upper zone (8-22%)
//   'bottom' → headline at 60% (default), badges stay in the upper zone (8-22%)
function getTopicStickers(text: string, headlinePosition: 'top' | 'middle' | 'bottom' = 'bottom'): { text: string; pos: Record<string, string>; rotate: number }[] {
  const t = text.toLowerCase();
  const stickers: { text: string; pos: Record<string, string>; rotate: number }[] = [];

  // Safe badge positions:
  //   'top'    → headline at 10%, badges go in the lower-middle zone (42-55%)
  //   'middle' → headline at 35%, badges stay in tight upper zone (6-28%) to avoid overlap
  //   'bottom' → headline at 60%, badges in upper zone (8-38%, all clear of headline)
  const p: Record<string, string>[] =
    headlinePosition === 'top'
      ? [
          { top: '42%', right: '5%' },
          { top: '50%', left: '4%' },
          { bottom: '22%', right: '5%' },
          { bottom: '28%', left: '4%' },
        ]
      : headlinePosition === 'middle'
        ? [
            { top: '6%',  right: '5%' },
            { top: '15%', left: '4%' },
            { top: '23%', right: '4%' },
            { top: '28%', left: '4%' },
          ]
        : [
            { top: '8%',  right: '5%' },
            { top: '20%', left: '4%' },
            { top: '30%', right: '4%' },
            { top: '38%', left: '4%' },
          ];

  const rotations = [3, -2, 2, -3];
  // Use stickers.length as position index so each new badge gets a unique slot.
  // Previously hardcoded indices caused overlapping when multiple keywords matched.
  const push = (text: string) => {
    const idx = stickers.length;
    stickers.push({ text, pos: p[idx % p.length], rotate: rotations[idx % rotations.length] });
  };

  if (/claude/i.test(t)) push('CLAUDE');
  if (/code/i.test(t)) push('CODE');
  if (/make\.com|make/i.test(t)) push('MAKE.COM');
  if (/automat/i.test(t)) push('AUTOMATE');
  if (/agent/i.test(t)) push('AGENTS');
  if (/ai\b/i.test(t)) push('AI');
  if (/scale|grow/i.test(t)) push('SCALE');
  if (/install|setup|vs.?code/i.test(t)) push('VS CODE');
  if (/workflow/i.test(t)) push('WORKFLOW');
  if (/prompt/i.test(t)) push('PROMPTS');
  if (/revenue|money|\$/i.test(t)) push('REVENUE');

  // Only add fallback if no topic badges matched
  if (stickers.length === 0) stickers.push({ text: 'AI', pos: p[0], rotate: 3 });

  return stickers.slice(0, 4);
}

function CoverTemplate({ slide, W, H, sc }: { slide: CarouselSlide; W: number; H: number; sc: number }) {
  const v = slide.visual as CoverPhotoVisual;
  const [coverHeadline, coverSubtitle] = slide.text.split('\n\n').map(s => s.replace(/^\(|\)$/g, '').trim());
  const headlineWords = coverHeadline.split(/\s+/);
  // Scale by word count first, then clamp down further if total chars are very long
  // (guards against multi-syllable words overflowing the 1080px - 120px padding space).
  const charLen = coverHeadline.length;
  const fontByWords = headlineWords.length <= 4 ? 96 * sc
    : headlineWords.length <= 6 ? 86 * sc
    : headlineWords.length <= 8 ? 76 * sc
    : 66 * sc;
  const fontByChars = charLen <= 20 ? 96 * sc
    : charLen <= 30 ? 86 * sc
    : charLen <= 45 ? 76 * sc
    : charLen <= 60 ? 66 * sc
    : 56 * sc;
  const fontSize = Math.min(fontByWords, fontByChars);
  // photo_enabled defaults to true unless explicitly set to false
  const photoEnabled = v.photo_enabled !== false;
  const hasPhoto = !!slide.backgroundImage && photoEnabled;
  const showFallbackPhoto = !hasPhoto && photoEnabled;
  // Headline vertical start: top=10%, middle=35%, bottom=60% (default)
  const headlinePos = v.position ?? 'bottom';
  const headlineTopFraction = headlinePos === 'top' ? 0.10 : headlinePos === 'middle' ? 0.35 : 0.60;
  const stickers = getTopicStickers(slide.text, headlinePos);

  return (
    <div style={{
      position: 'relative', width: `${W}px`, height: `${H}px`, overflow: 'hidden',
      fontFamily: Brand.typography.font_family,
      backgroundColor: Brand.colors.bg_primary,
      ...(hasPhoto ? { backgroundImage: `url(${slide.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center top' } : {}),
    }}>

      {/* Fallback: nick.jpg if no uploaded photo and photo is enabled */}
      {showFallbackPhoto && (
        <img src="/nick.jpg" alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
        />
      )}

      {/* Dark overlay — strong for text readability */}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)' }} />

      {/* Bottom gradient — extra dark where text sits */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.85) 100%)' }} />

      {/* Topic-relevant sticker badges — bold orange pills, clearly visible */}
      {stickers.map((sticker, i) => (
        <div key={i} style={{
          position: 'absolute', ...sticker.pos,
          transform: `rotate(${sticker.rotate}deg)`,
          backgroundColor: 'rgba(255,113,7,0.18)',
          border: `${2 * sc}px solid rgba(255,113,7,0.70)`,
          borderRadius: `${10 * sc}px`,
          padding: `${10 * sc}px ${22 * sc}px`,
          fontSize: `${17 * sc}px`,
          fontWeight: 800,
          color: Brand.colors.accent_primary,
          letterSpacing: '0.10em',
          fontFamily: Brand.typography.font_family,
          filter: `drop-shadow(0 0 ${16 * sc}px rgba(255,113,7,0.50))`,
          zIndex: 2,
          opacity: 0.95,
        }}>{sticker.text}</div>
      ))}

      {/* Headline — vertical position controlled by v.position (default: bottom at 60%) */}
      <div style={{ position: 'absolute', top: `${H * headlineTopFraction}px`, bottom: `${120 * sc}px`, left: `${60 * sc}px`, right: `${60 * sc}px`, zIndex: 3 }}>
        <div style={{ fontSize: `${fontSize}px`, fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: `${14 * sc}px`, textShadow: '0 2px 20px rgba(0,0,0,0.95), 0 1px 6px rgba(0,0,0,0.85)' }}>
          {renderWithAccent(coverHeadline, slide.accent_word, { color: Brand.colors.text_primary })}
        </div>
        {(coverSubtitle || v.subtext) && (
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: `${24 * sc}px`, fontWeight: 500, lineHeight: 1.4, margin: 0 }}>
            {coverSubtitle || v.subtext}
          </p>
        )}
      </div>

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: `${34 * sc}px`, left: `${60 * sc}px`, right: `${60 * sc}px`, zIndex: 3 }}>
        <Footer sc={sc} light />
      </div>
    </div>
  );
}

// ─── CTA Template — photo variant (Nick right half) or text-only ─────────────

function CTATemplate({ slide, W, H, sc }: { slide: CarouselSlide; W: number; H: number; sc: number }) {
  const v = slide.visual as CTASlideVisual;
  const PH = 52 * sc;

  const hasImagen = !!slide.backgroundImage;

  // ── Option A: Photo variant — Nick on right, dark brand bg on left ──
  // The right-side <img> uses slide.backgroundImage (set via Step2 photo shuffle), falling back
  // to /nick.jpg. We keep the slide background as solid dark (#1A1A1A) to avoid double-Nick.
  if (v.layout_variant === 'photo') {
    const photoSrc = slide.backgroundImage || '/nick.jpg';
    const ctaPhotoFontSize = slide.text.length <= 30 ? 56 * sc
      : slide.text.length <= 50 ? 48 * sc
      : slide.text.length <= 70 ? 42 * sc
      : 36 * sc;
    return (
      <div style={{
        position: 'relative', width: `${W}px`, height: `${H}px`, overflow: 'hidden', fontFamily: Brand.typography.font_family,
        backgroundColor: Brand.colors.bg_primary,
      }}>
        {/* Nick's photo on right — uses the selected photo from Step2 shuffle */}
        <img src={photoSrc} alt="" style={{ position: 'absolute', right: 0, top: 0, width: `${W * 0.60}px`, height: `${H}px`, objectFit: 'cover', objectPosition: 'center top', opacity: 0.72, zIndex: 1 }} />
        {/* Gradient fade left — keeps text readable */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${Brand.colors.bg_primary} 32%, rgba(26,26,26,0.88) 52%, rgba(26,26,26,0.40) 72%, rgba(26,26,26,0.08) 100%)`, zIndex: 2 }} />
        {/* Subtle orange glow on left */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: '60%', height: '100%', background: 'radial-gradient(ellipse 80% 60% at 25% 50%, rgba(255,113,7,0.09) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 3 }} />

        {/* Left content column */}
        <div style={{ position: 'absolute', left: `${PH}px`, right: `${W * 0.52}px`, top: 0, bottom: `${80 * sc}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: `${22 * sc}px`, zIndex: 4 }}>
          <div style={{ fontSize: `${ctaPhotoFontSize}px`, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', textShadow: 'none' }}>
            {renderWithAccent(slide.text, slide.accent_word, { color: Brand.colors.text_primary })}
          </div>
          <div style={{ width: `${52 * sc}px`, height: `${3 * sc}px`, background: Brand.colors.accent_primary, borderRadius: '2px' }} />
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' as const, gap: `${8 * sc}px` }}>
            <span style={{ color: Brand.colors.text_primary, fontSize: `${24 * sc}px`, fontWeight: 600 }}>Comment</span>
            {v.keyword && <span style={{ backgroundColor: Brand.colors.accent_primary, color: '#000', fontSize: `${26 * sc}px`, fontWeight: 800, padding: `${7 * sc}px ${18 * sc}px`, borderRadius: `${26 * sc}px`, lineHeight: 1.2 }}>{v.keyword}</span>}
            <span style={{ color: Brand.colors.text_primary, fontSize: `${24 * sc}px`, fontWeight: 600 }}>I'll send it over 🔥</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: `${34 * sc}px`, left: `${PH}px`, right: `${PH}px`, borderTop: `1px solid ${Brand.colors.divider}`, paddingTop: `${12 * sc}px`, display: 'flex', justifyContent: 'space-between', zIndex: 4 }}>
          <span style={{ color: Brand.colors.text_muted, fontSize: `${12 * sc}px`, fontWeight: 500 }}>@thenickcornelius</span>
          <span style={{ color: Brand.colors.text_muted, fontSize: `${12 * sc}px`, fontWeight: 500 }}>{Brand.brand.save_cta}</span>
        </div>
      </div>
    );
  }

  // ── Option B: Text-only (centered) ──
  return (
    <div style={{
      position: 'relative', width: `${W}px`, height: `${H}px`, overflow: 'hidden', fontFamily: Brand.typography.font_family,
      ...(hasImagen
        ? { backgroundImage: `url(${slide.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { backgroundColor: Brand.colors.bg_primary }),
    }}>

      {/* Dark overlay */}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: hasImagen ? 'rgba(0,0,0,0.50)' : 'transparent' }} />

      {/* Stronger radial glow for CTA — adds brand orange on top of any background */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(255,113,7,0.12) 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 40% 30% at 50% 48%, rgba(255,113,7,0.06) 0%, transparent 65%)' }} />

      {/* Centered content */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `${80 * sc}px ${70 * sc}px` }}>

        <div style={{ fontSize: `${60 * sc}px`, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', textAlign: 'center', marginBottom: `${36 * sc}px` }}>
          {renderWithAccent(slide.text, slide.accent_word, { color: Brand.colors.text_primary })}
        </div>

        <div style={{ width: `${60 * sc}px`, height: `${3 * sc}px`, background: `linear-gradient(90deg, ${Brand.colors.accent_primary}, ${Brand.colors.accent_secondary})`, borderRadius: '2px', marginBottom: `${40 * sc}px` }} />

        <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: `${10 * sc}px`, flexWrap: 'wrap' as const }}>
          <span style={{ color: Brand.colors.text_primary, fontSize: `${26 * sc}px`, fontWeight: 600 }}>Comment</span>
          {v.keyword && <span style={{ backgroundColor: Brand.colors.accent_primary, color: '#000000', fontSize: `${28 * sc}px`, fontWeight: 800, padding: `${8 * sc}px ${22 * sc}px`, borderRadius: `${28 * sc}px`, lineHeight: 1.2 }}>{v.keyword}</span>}
          <span style={{ color: Brand.colors.text_primary, fontSize: `${26 * sc}px`, fontWeight: 600 }}>I'll send it over 🔥</span>
        </div>

        <div style={{ fontSize: `${48 * sc}px`, color: Brand.colors.accent_primary, lineHeight: 1, marginTop: `${32 * sc}px`, filter: `drop-shadow(0 0 ${10 * sc}px rgba(255,113,7,0.5))` }}>↓</div>
      </div>

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: `${36 * sc}px`, left: `${60 * sc}px`, right: `${60 * sc}px`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${Brand.colors.divider}`, paddingTop: `${14 * sc}px` }}>
        <span style={{ color: Brand.colors.text_muted, fontSize: `${12 * sc}px`, fontWeight: 500 }}>@thenickcornelius</span>
        <span style={{ color: Brand.colors.text_muted, fontSize: `${12 * sc}px`, fontWeight: 500 }}>{Brand.brand.save_cta}</span>
      </div>
    </div>
  );
}

// ─── Main Renderer ────────────────────────────────────────────────────────────

const SlideRenderer = forwardRef<HTMLDivElement, Props>(({ slide, slideNumber, totalSlides, forExport = false }, ref) => {
  const W = forExport ? 1080 : 540, H = forExport ? 1350 : 675, sc = W / 1080;
  const PH = 52 * sc, PV = 56 * sc;

  // ── Cover slide ──
  if (slide.visual?.type === 'cover_photo') {
    return (
      <div ref={ref} style={{ position: 'relative', width: `${W}px`, height: `${H}px`, flexShrink: 0, overflow: 'hidden' }}>
        <CoverTemplate slide={slide} W={W} H={H} sc={sc} />
        <RenderOverlays slide={slide} W={W} H={H} />
      </div>
    );
  }

  // ── CTA slide ──
  if (slide.visual?.type === 'cta_slide') {
    return (
      <div ref={ref} style={{ position: 'relative', width: `${W}px`, height: `${H}px`, flexShrink: 0, overflow: 'hidden' }}>
        <CTATemplate slide={slide} W={W} H={H} sc={sc} />
        <RenderOverlays slide={slide} W={W} H={H} />
      </div>
    );
  }

  // ─── Standard content slides — NO header, vertically centered ───

  const isBigQuote = slide.visual?.type === 'big_quote';
  // A visual block only renders when the visual type has meaningful data.
  // Visual objects from the AI only have a 'type' field when the user manually
  // changed visual_type in Step1 without AI providing full data — guard against
  // rendering empty frames for those types.
  const visualHasData = (() => {
    const v = slide.visual;
    if (!v || v.type === 'none') return false;
    if (v.type === 'code_block') return !!(v as CodeBlockVisual).code;
    if (v.type === 'stats_grid') return !!((v as StatsGridVisual).stats?.length);
    if (v.type === 'diagram') return !!((v as DiagramVisual).nodes?.length);
    if (v.type === 'steps_list') return !!((v as StepsListVisual).steps?.length);
    if (v.type === 'comparison') return !!((v as ComparisonVisual).before_items?.length || (v as ComparisonVisual).after_items?.length);
    if (v.type === 'checklist') return !!((v as ChecklistVisual).items?.length);
    if (v.type === 'skill_card') return !!(v as SkillCardVisual).name;
    // big_quote — renders even if partial (supporting text is optional)
    return true;
  })();
  const hasVis = visualHasData;
  const hasImagen = !!slide.backgroundImage;
  const paras = (slide.text || '').split('\n\n').filter(Boolean);
  const headline = paras[0] || slide.text || '';
  const bodyParas = paras.length >= 3 ? paras.slice(1, -1) : paras.length === 2 ? [paras[1]] : [];
  const kicker = paras.length >= 3 ? paras[paras.length - 1] : null;
  const headlineLen = headline.length;
  // Tyler Germain spec: headlines 48-52px bold at export (44px for long headlines)
  const headlineFs = isBigQuote
    ? (headlineLen > 120 ? 36 * sc : headlineLen > 70 ? 44 * sc : 52 * sc)
    : (headlineLen > 60 ? 44 * sc : headlineLen > 40 ? 48 * sc : 52 * sc);

  // Text block offset (set via Step 3 drag handle; stored in 1080-scale px)
  const txOff = (slide.textOffsetX || 0) * sc;
  const tyOff = (slide.textOffsetY || 0) * sc;

  return (
    <div ref={ref} style={{
      width: `${W}px`, height: `${H}px`,
      position: 'relative', overflow: 'hidden', flexShrink: 0,
      fontFamily: Brand.typography.font_family,
      display: 'flex', flexDirection: 'column',
      // Imagen 3 background when available, else dark solid
      ...(hasImagen
        ? { backgroundImage: `url(${slide.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { backgroundColor: Brand.colors.bg_primary }),
    }}>
      {/* Dark overlay for text readability over Imagen 3 */}
      {hasImagen && <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 0, pointerEvents: 'none' }} />}

      {/* Subtle top gradient wash — only when no Imagen 3 */}
      {!hasImagen && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '25%', background: `linear-gradient(to bottom, rgba(255,113,7,0.025), transparent)`, pointerEvents: 'none' }} />}

      {/* Orange left border accent — all content slides (Tyler Germain signature) */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${6 * sc}px`, background: Brand.colors.accent_primary, zIndex: 4 }} />
      {/* Subtle orange radial glow */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(255,113,7,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Big quote decorative mark — background element */}
      {isBigQuote && (
        <div style={{ position: 'absolute', top: `${-10 * sc}px`, left: `${44 * sc}px`, fontSize: `${160 * sc}px`, lineHeight: 1, color: Brand.colors.accent_primary, opacity: 0.12, fontFamily: 'Georgia, serif', fontWeight: 900, zIndex: 0, pointerEvents: 'none', userSelect: 'none' as const }}>"</div>
      )}

      {/* Content — vertically centered */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: `${PV}px ${PH}px`, paddingBottom: `${16 * sc}px`,
        position: 'relative', gap: `${22 * sc}px`,
        overflow: 'hidden', minHeight: 0,
      }}>

        {/* Section label */}
        {slide.section_label && <SectionLabel label={slide.section_label} sc={sc} />}

        {/* Tyler Germain layout: headline → orange divider → body → kicker.
            Text offset (set by drag handle in Step3) is applied only to this block,
            not to the visual block, so repositioning text doesn't shift stacked visuals. */}
        {!slide.useTextOverlays && (
        <div style={{ flexShrink: 0, ...(txOff || tyOff ? { transform: `translate(${txOff}px, ${tyOff}px)` } : {}) }}>
          {/* Headline — always 44-52px bold (Tyler Germain spec) */}
          <p style={{
            margin: 0, marginBottom: `${16 * sc}px`,
            fontSize: `${headlineFs}px`, fontWeight: 800,
            color: Brand.colors.text_primary,
            lineHeight: isBigQuote ? 1.3 : 1.18,
            letterSpacing: '-0.03em',
            ...(isBigQuote ? { fontStyle: 'italic' as const } : {}),
          }}>
            {renderWithAccent(headline, slide.accent_word)}
          </p>
          {/* Orange divider — Tyler Germain signature (skip for big_quote which has its own) */}
          {!isBigQuote && (
            <div style={{
              width: `${44 * sc}px`, height: `${3 * sc}px`,
              background: Brand.colors.accent_primary,
              borderRadius: '2px',
              marginBottom: `${(!hasVis && bodyParas.length > 0) ? 24 * sc : 0}px`,
            }} />
          )}
          {/* Body — 24px regular, only for text-only slides (no visual block) */}
          {!hasVis && bodyParas.map((p, i) => (
            <p key={i} style={{
              margin: 0, marginBottom: `${12 * sc}px`,
              fontSize: `${24 * sc}px`, fontWeight: 400,
              color: Brand.colors.text_primary, lineHeight: 1.55, letterSpacing: '-0.01em',
            }}>
              {renderWithAccent(p, slide.accent_word)}
            </p>
          ))}
          {/* Kicker — 28px bold with visual breathing room. Stands apart from body as the mic-drop takeaway. */}
          {!hasVis && kicker && (
            <div style={{ marginTop: `${28 * sc}px` }}>
              <div style={{ width: `${32 * sc}px`, height: `${2 * sc}px`, background: Brand.colors.accent_primary, borderRadius: '2px', marginBottom: `${10 * sc}px`, opacity: 0.8 }} />
              <p style={{
                margin: 0,
                fontSize: `${28 * sc}px`, fontWeight: 700,
                color: Brand.colors.text_primary, lineHeight: 1.3, letterSpacing: '-0.025em',
              }}>
                {renderWithAccent(kicker, slide.accent_word)}
              </p>
            </div>
          )}
        </div>
        )}

        {/* ── Visual ── */}
        {hasVis && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0, overflow: 'hidden' }}>

            {/* CODE BLOCK */}
            {slide.visual.type === 'code_block' && (() => {
              const v = slide.visual as CodeBlockVisual;
              return (
                <div style={{ overflow: 'hidden' }}>
                  {v.instruction && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: `${6 * sc}px`, marginBottom: `${10 * sc}px` }}>
                      <span style={{ color: Brand.colors.accent_primary, fontSize: `${13 * sc}px`, fontWeight: 700 }}>→</span>
                      <span style={{ color: Brand.colors.text_muted, fontSize: `${13 * sc}px`, fontWeight: 500, fontStyle: 'italic' as const }}>{v.instruction}</span>
                    </div>
                  )}
                  <div style={{ backgroundColor: Brand.colors.bg_surface, borderRadius: `${12 * sc}px`, overflow: 'hidden', border: `1px solid ${Brand.colors.code_border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: `${6 * sc}px`, padding: `${9 * sc}px ${14 * sc}px`, backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${Brand.colors.divider}` }}>
                      {['#FF5F56', '#FFBD2E', '#27C93F'].map((c, i) => <div key={i} style={{ width: `${9 * sc}px`, height: `${9 * sc}px`, borderRadius: '50%', backgroundColor: c }} />)}
                      <span style={{ marginLeft: `${8 * sc}px`, fontSize: `${13 * sc}px`, color: Brand.colors.text_muted, fontFamily: Brand.typography.mono_font }}>{v.language || 'prompt'}</span>
                    </div>
                    <div style={{ padding: `${14 * sc}px ${16 * sc}px`, fontFamily: Brand.typography.mono_font, fontSize: `${15 * sc}px`, lineHeight: 1.65 }}>
                      {highlightCode(v.code || '', v.highlights || [], sc)}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* FIX 3: STATS GRID — larger values, orange separator, bigger cards */}
            {slide.visual.type === 'stats_grid' && (() => {
              const v = slide.visual as StatsGridVisual;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: `${14 * sc}px` }}>
                  {/* Orange separator line */}
                  <div style={{ width: '40%', height: `${3 * sc}px`, background: Brand.colors.accent_primary, borderRadius: '2px' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: `${14 * sc}px` }}>
                    {(v.stats || []).slice(0, 4).map((s, i) => (
                      <div key={i} style={{
                        backgroundColor: Brand.colors.bg_surface,
                        borderRadius: `${14 * sc}px`,
                        padding: `${28 * sc}px ${20 * sc}px`,
                        border: `1px solid ${Brand.colors.divider}`,
                        display: 'flex', flexDirection: 'column', gap: `${8 * sc}px`,
                      }}>
                        <div style={{ fontSize: `${28 * sc}px`, lineHeight: 1 }}>{s.icon}</div>
                        {/* FIX 3: value font at least 64px at export */}
                        <div style={{ fontSize: `${64 * sc}px`, fontWeight: 800, color: Brand.colors.accent_primary, lineHeight: 1, letterSpacing: '-0.03em' }}>{s.value}</div>
                        <div style={{ fontSize: `${14 * sc}px`, color: Brand.colors.text_muted, textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontWeight: 600 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* FIX 3: DIAGRAM — larger nodes filling the available space */}
            {slide.visual.type === 'diagram' && (() => {
              const v = slide.visual as DiagramVisual;
              const nodeCount = (v.nodes || []).length;
              const availW = W - PH * 2;
              const nW = availW * 0.88;
              // Adaptive node height based on count — fill available vertical space
              const nH = nodeCount <= 3 ? 120 * sc : nodeCount <= 4 ? 90 * sc : 70 * sc;
              const gap = nodeCount <= 3 ? 64 * sc : 48 * sc;
              const sH = nodeCount * (nH + gap) - gap;
              const nX = (availW - nW) / 2;

              const pos: Record<string, { x: number; y: number }> = {};
              (v.nodes || []).forEach((n, i) => { pos[n.id] = { x: nX, y: i * (nH + gap) }; });

              const clr: Record<string, { bg: string; border: string; text: string }> = {
                input:   { bg: 'rgba(29,155,240,0.12)',   border: '#1D9BF0',                    text: '#1D9BF0' },
                process: { bg: `rgba(255,113,7,0.12)`,    border: Brand.colors.accent_primary,   text: Brand.colors.accent_primary },
                output:  { bg: 'rgba(34,197,94,0.12)',    border: '#22C55E',                    text: '#22C55E' },
              };

              return (
                <div>
                  {v.title && (
                    <div style={{ textAlign: 'center', fontSize: `${13 * sc}px`, color: Brand.colors.text_muted, marginBottom: `${14 * sc}px`, textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 600 }}>
                      {v.title}
                    </div>
                  )}
                  <svg width={availW} height={sH} style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>
                    {(v.edges || []).map((e, i) => {
                      const f = pos[e.from], t = pos[e.to];
                      if (!f || !t) return null;
                      const x1 = f.x + nW / 2, y1 = f.y + nH, x2 = t.x + nW / 2, y2 = t.y;
                      return (
                        <g key={i}>
                          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.15)" strokeWidth={2 * sc} />
                          <polygon points={`${x2},${y2} ${x2 - 6 * sc},${y2 - 10 * sc} ${x2 + 6 * sc},${y2 - 10 * sc}`} fill="rgba(255,255,255,0.15)" />
                        </g>
                      );
                    })}
                    {(v.nodes || []).map(n => {
                      const p = pos[n.id];
                      if (!p) return null;
                      const c = clr[n.type] || clr.process;
                      return (
                        <g key={n.id}>
                          <rect x={p.x} y={p.y} width={nW} height={nH} rx={16 * sc} fill={c.bg} stroke={c.border} strokeWidth={1.5 * sc} />
                          <text
                            x={p.x + nW / 2} y={p.y + nH / 2}
                            textAnchor="middle" dominantBaseline="middle"
                            fill={c.text} fontSize={16 * sc}
                            fontFamily={Brand.typography.font_family} fontWeight="700"
                          >{n.label}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              );
            })()}

            {/* FIX 3: STEPS LIST — larger circles, more breathing room */}
            {slide.visual.type === 'steps_list' && (() => {
              const v = slide.visual as StepsListVisual;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: `${32 * sc}px`, justifyContent: 'center' }}>
                  {(v.steps || []).slice(0, 4).map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: `${18 * sc}px`, alignItems: 'flex-start' }}>
                      {/* FIX 3: Circle 48px minimum at export */}
                      <div style={{
                        width: `${48 * sc}px`, height: `${48 * sc}px`, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${Brand.colors.accent_primary}, ${Brand.colors.accent_secondary})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, fontSize: `${20 * sc}px`, fontWeight: 800, color: 'white',
                      }}>{s.number}</div>
                      <div style={{ flex: 1, paddingTop: `${4 * sc}px` }}>
                        <div style={{ fontSize: `${22 * sc}px`, fontWeight: 700, color: Brand.colors.text_primary, marginBottom: `${8 * sc}px`, lineHeight: 1.25 }}>{s.title}</div>
                        <div style={{ fontSize: `${18 * sc}px`, color: Brand.colors.text_muted, lineHeight: 1.5 }}>{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* SKILL CARD */}
            {slide.visual.type === 'skill_card' && (() => {
              const v = slide.visual as SkillCardVisual;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: `${14 * sc}px` }}>
                  <div style={{ textAlign: 'center', fontSize: `${22 * sc}px`, color: Brand.colors.accent_primary, letterSpacing: `${3 * sc}px` }}>★★★★★</div>
                  <div style={{ backgroundColor: Brand.colors.bg_surface, borderRadius: `${14 * sc}px`, padding: `${20 * sc}px ${22 * sc}px`, border: `1px solid ${Brand.colors.code_border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: `${14 * sc}px`, marginBottom: `${12 * sc}px` }}>
                      {v.icon && <span style={{ fontSize: `${32 * sc}px`, lineHeight: 1 }}>{v.icon}</span>}
                      <div>
                        <div style={{ fontSize: `${22 * sc}px`, fontWeight: 700, color: Brand.colors.text_primary }}>{v.name}</div>
                        <div style={{ fontSize: `${16 * sc}px`, color: Brand.colors.text_muted, marginTop: `${4 * sc}px` }}>{v.source}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', background: Brand.colors.bg_surface, borderRadius: `${8 * sc}px`, padding: `${5 * sc}px ${12 * sc}px`, fontSize: `${13 * sc}px`, color: Brand.colors.text_muted, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{v.category}</div>
                    </div>
                  </div>
                  {v.description && <p style={{ fontSize: `${17 * sc}px`, color: Brand.colors.text_muted, lineHeight: 1.5, margin: 0, textAlign: 'center' }}>{v.description}</p>}
                </div>
              );
            })()}

            {/* BIG QUOTE — orange accent line + optional supporting text */}
            {slide.visual.type === 'big_quote' && (() => {
              const v = slide.visual as BigQuoteVisual;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: `${12 * sc}px` }}>
                  <div style={{ width: `${40 * sc}px`, height: `${3 * sc}px`, background: Brand.colors.accent_primary, borderRadius: '2px' }} />
                  {v.supporting && (
                    <p style={{ margin: 0, fontSize: `${18 * sc}px`, color: Brand.colors.text_muted, lineHeight: 1.5 }}>{v.supporting}</p>
                  )}
                </div>
              );
            })()}

            {/* COMPARISON — 2-column before/after grid */}
            {slide.visual.type === 'comparison' && (() => {
              const v = slide.visual as ComparisonVisual;
              const headerColor = { before: '#F87171', after: '#4ADE80' };
              const itemBg = { before: 'rgba(248,113,113,0.07)', after: 'rgba(74,222,128,0.07)' };
              const itemBorder = { before: 'rgba(248,113,113,0.15)', after: 'rgba(74,222,128,0.15)' };
              const markColor = { before: '#F87171', after: '#4ADE80' };
              return (
                <div style={{ display: 'flex', gap: `${18 * sc}px` }}>
                  {(['before', 'after'] as const).map(side => {
                    const items = side === 'before' ? (v.before_items || []) : (v.after_items || []);
                    const label = side === 'before' ? (v.before_label || '❌ Without AI') : (v.after_label || '✅ With AI');
                    return (
                      <div key={side} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: `${10 * sc}px` }}>
                        <div style={{ fontSize: `${18 * sc}px`, fontWeight: 700, color: headerColor[side], letterSpacing: '0.02em', marginBottom: `${6 * sc}px`, lineHeight: 1.3 }}>{label}</div>
                        {items.map((item, i) => (
                          <div key={i} style={{ display: 'flex', gap: `${10 * sc}px`, alignItems: 'flex-start', backgroundColor: itemBg[side], borderRadius: `${8 * sc}px`, padding: `${10 * sc}px ${12 * sc}px`, border: `1px solid ${itemBorder[side]}` }}>
                            <span style={{ color: markColor[side], fontSize: `${14 * sc}px`, flexShrink: 0, marginTop: `${2 * sc}px`, fontWeight: 800 }}>{side === 'before' ? '✕' : '✓'}</span>
                            <span style={{ fontSize: `${17 * sc}px`, color: side === 'before' ? Brand.colors.text_muted : Brand.colors.text_primary, lineHeight: 1.4 }}>{item}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* CHECKLIST — orange circle checkmarks */}
            {slide.visual.type === 'checklist' && (() => {
              const v = slide.visual as ChecklistVisual;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: `${20 * sc}px` }}>
                  {(v.items || []).map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: `${16 * sc}px`, alignItems: 'center' }}>
                      <div style={{ width: `${36 * sc}px`, height: `${36 * sc}px`, borderRadius: '50%', background: Brand.colors.accent_primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: `${18 * sc}px`, color: 'white', fontWeight: 800 }}>✓</div>
                      <span style={{ fontSize: `${20 * sc}px`, color: Brand.colors.text_primary, lineHeight: 1.4 }}>{item.text}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{ padding: `0 ${PH}px ${20 * sc}px`, flexShrink: 0, position: 'relative' }}>
        <Footer sc={sc} />
      </div>

      {/* Stickers + text overlays — rendered on top of everything */}
      <RenderOverlays slide={slide} W={W} H={H} />
    </div>
  );
});

SlideRenderer.displayName = 'SlideRenderer';
export default SlideRenderer;

'use client';
import React, { forwardRef } from 'react';
import { Brand } from '../brand/simpliscale';
import {
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
        <span style={{ color: '#4B5563', userSelect: 'none', marginRight: `${16 * sc}px`, minWidth: `${24 * sc}px`, textAlign: 'right', flexShrink: 0, fontSize: `${10 * sc}px` }}>{li + 1}</span>
        <span style={{ flex: 1 }}>{tokens.length > 0 ? tokens : <span>&nbsp;</span>}</span>
      </div>
    );
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ label, sc }: { label: string; sc: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: `${8 * sc}px`, marginBottom: `${16 * sc}px`, flexShrink: 0 }}>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.12)' }} />
      <span style={{
        color: Brand.colors.text_muted, fontSize: `${11 * sc}px`, fontWeight: 600,
        letterSpacing: '0.12em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const,
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

// ─── FIX 2 + 4: Cover Template — full-bleed photo, structured floating icons ──

// Topic-relevant sticker-style labels (not emojis — text badges with tech terms)
const STICKER_LABELS = [
  { text: 'AI', pos: { top: '8%', right: '6%' }, rotate: 4 },
  { text: 'AUTOMATE', pos: { top: '22%', left: '4%' }, rotate: -3 },
  { text: 'SCALE', pos: { top: '18%', right: '5%' }, rotate: 2 },
  { text: 'BUILD', pos: { bottom: '32%', right: '6%' }, rotate: -2 },
];

// Generate topic-relevant sticker labels from slide text
function getTopicStickers(text: string): { text: string; pos: Record<string, string>; rotate: number }[] {
  const t = text.toLowerCase();
  const stickers: { text: string; pos: Record<string, string>; rotate: number }[] = [];

  // Pick 3-4 relevant stickers based on topic keywords
  if (/claude/i.test(t)) stickers.push({ text: 'CLAUDE', pos: { top: '8%', right: '5%' }, rotate: 3 });
  if (/code/i.test(t)) stickers.push({ text: 'CODE', pos: { top: '20%', left: '4%' }, rotate: -2 });
  if (/make\.com|make/i.test(t)) stickers.push({ text: 'MAKE.COM', pos: { top: '10%', right: '4%' }, rotate: 2 });
  if (/automat/i.test(t)) stickers.push({ text: 'AUTOMATE', pos: { top: '22%', left: '4%' }, rotate: -3 });
  if (/agent/i.test(t)) stickers.push({ text: 'AGENTS', pos: { top: '12%', right: '5%' }, rotate: 4 });
  if (/ai\b/i.test(t)) stickers.push({ text: 'AI', pos: { top: '8%', right: '6%' }, rotate: 3 });
  if (/scale|grow/i.test(t)) stickers.push({ text: 'SCALE', pos: { bottom: '30%', right: '5%' }, rotate: -2 });
  if (/install|setup|vs.?code/i.test(t)) stickers.push({ text: 'VS CODE', pos: { top: '12%', right: '5%' }, rotate: 2 });
  if (/workflow/i.test(t)) stickers.push({ text: 'WORKFLOW', pos: { top: '18%', left: '4%' }, rotate: -3 });
  if (/prompt/i.test(t)) stickers.push({ text: 'PROMPTS', pos: { top: '10%', right: '5%' }, rotate: 3 });
  if (/revenue|money|\$/i.test(t)) stickers.push({ text: 'REVENUE', pos: { bottom: '32%', right: '5%' }, rotate: -2 });

  // Always include a generic if we have fewer than 2
  if (stickers.length < 2) stickers.push({ text: 'AI', pos: { top: '8%', right: '6%' }, rotate: 3 });
  if (stickers.length < 3) stickers.push({ text: 'BUILD', pos: { bottom: '30%', right: '5%' }, rotate: -2 });

  return stickers.slice(0, 4);
}

function CoverTemplate({ slide, W, H, sc }: { slide: CarouselSlide; W: number; H: number; sc: number }) {
  const v = slide.visual as CoverPhotoVisual;
  const words = slide.text.split(/\s+/);
  const fontSize = Math.max(72 * sc, words.length <= 5 ? 92 * sc : words.length <= 7 ? 80 * sc : 70 * sc);
  // photo_enabled defaults to true unless explicitly set to false
  const photoEnabled = v.photo_enabled !== false;
  const hasPhoto = !!slide.backgroundImage && photoEnabled;
  const showFallbackPhoto = !hasPhoto && photoEnabled;
  const stickers = getTopicStickers(slide.text);
  // Headline vertical start: top=10%, middle=35%, bottom=60% (default)
  const headlineTopFraction = v.position === 'top' ? 0.10 : v.position === 'middle' ? 0.35 : 0.60;

  return (
    <div style={{
      position: 'relative', width: `${W}px`, height: `${H}px`, overflow: 'hidden',
      fontFamily: Brand.typography.font_family,
      backgroundColor: '#0A0A0A',
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

      {/* Topic-relevant sticker badges — rotated, semi-transparent */}
      {stickers.map((sticker, i) => (
        <div key={i} style={{
          position: 'absolute', ...sticker.pos,
          transform: `rotate(${sticker.rotate}deg)`,
          backgroundColor: 'rgba(255,113,7,0.12)',
          border: `${1.5 * sc}px solid rgba(255,113,7,0.35)`,
          borderRadius: `${6 * sc}px`,
          padding: `${5 * sc}px ${12 * sc}px`,
          fontSize: `${11 * sc}px`,
          fontWeight: 800,
          color: Brand.colors.accent_primary,
          letterSpacing: '0.1em',
          fontFamily: Brand.typography.font_family,
          filter: `drop-shadow(0 0 ${10 * sc}px rgba(255,113,7,0.25))`,
          zIndex: 2,
          opacity: 0.8,
        }}>{sticker.text}</div>
      ))}

      {/* Headline — vertical position controlled by v.position (default: bottom at 60%) */}
      <div style={{ position: 'absolute', top: `${H * headlineTopFraction}px`, bottom: `${120 * sc}px`, left: `${60 * sc}px`, right: `${60 * sc}px`, zIndex: 3 }}>
        <div style={{ fontSize: `${fontSize}px`, fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: `${14 * sc}px` }}>
          {renderWithAccent(slide.text, slide.accent_word, { color: Brand.colors.text_primary })}
        </div>
        {v.subtext && (
          <p style={{ color: Brand.colors.text_muted, fontSize: `${18 * sc}px`, fontWeight: 500, lineHeight: 1.4, margin: 0 }}>{v.subtext}</p>
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

  // ── Option A: Photo variant — Nick on right, text on left ──
  if (v.layout_variant === 'photo') {
    return (
      <div style={{
        position: 'relative', width: `${W}px`, height: `${H}px`, overflow: 'hidden', fontFamily: Brand.typography.font_family,
        ...(hasImagen
          ? { backgroundImage: `url(${slide.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { backgroundColor: Brand.colors.bg_primary }),
      }}>
        {/* Nick's photo — right half */}
        {/* When Imagen 3 is present, add a base dark overlay first */}
        {hasImagen && <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 0 }} />}
        {/* Nick's photo on right — always shown for photo layout (design element, not background) */}
        <img src="/nick.jpg" alt="" style={{ position: 'absolute', right: 0, top: 0, width: `${W * 0.60}px`, height: `${H}px`, objectFit: 'cover', objectPosition: 'center top', opacity: hasImagen ? 0.55 : 0.72, zIndex: 1 }} />
        {/* Gradient fade left — keeps text readable */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${Brand.colors.bg_primary} 32%, rgba(17,17,17,0.88) 52%, rgba(17,17,17,0.40) 72%, rgba(17,17,17,0.08) 100%)`, zIndex: 2 }} />
        {/* Subtle orange glow on left */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: '60%', height: '100%', background: 'radial-gradient(ellipse 80% 60% at 25% 50%, rgba(255,113,7,0.09) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 3 }} />

        {/* Left content column */}
        <div style={{ position: 'absolute', left: `${PH}px`, right: `${W * 0.52}px`, top: 0, bottom: `${80 * sc}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: `${22 * sc}px`, zIndex: 4 }}>
          <div style={{ fontSize: `${40 * sc}px`, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em' }}>
            {renderWithAccent(slide.text, slide.accent_word, { color: Brand.colors.text_primary })}
          </div>
          <div style={{ width: `${44 * sc}px`, height: `${3 * sc}px`, background: Brand.colors.accent_primary, borderRadius: '2px' }} />
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' as const, gap: `${8 * sc}px` }}>
            <span style={{ color: Brand.colors.text_primary, fontSize: `${20 * sc}px`, fontWeight: 600 }}>Comment</span>
            <span style={{ backgroundColor: Brand.colors.accent_primary, color: '#000', fontSize: `${22 * sc}px`, fontWeight: 800, padding: `${6 * sc}px ${14 * sc}px`, borderRadius: `${6 * sc}px`, lineHeight: 1.2 }}>{v.keyword}</span>
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
          <span style={{ backgroundColor: Brand.colors.accent_primary, color: '#000000', fontSize: `${28 * sc}px`, fontWeight: 800, padding: `${8 * sc}px ${20 * sc}px`, borderRadius: `${8 * sc}px`, lineHeight: 1.2 }}>{v.keyword}</span>
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
  const hasVis = slide.visual?.type !== 'none' && !!slide.visual?.type;
  const hasImagen = !!slide.backgroundImage;
  const paras = (slide.text || '').split('\n\n').filter(Boolean);
  const chars = (slide.text || '').length;
  const fs = isBigQuote
    ? (chars > 120 ? 36 * sc : chars > 70 ? 44 * sc : 52 * sc)
    : (chars > 120 ? 30 * sc : chars > 80 ? 34 * sc : 40 * sc);

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

      {/* ── Step 4 accent system ── */}
      {/* Slide 2: 3px left border */}
      {slideNumber === 2 && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${3 * sc}px`, background: Brand.colors.accent_primary, zIndex: 4 }} />
      )}
      {/* Slides 3+: subtle radial glow */}
      {slideNumber >= 3 && (
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(255,113,7,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      )}

      {/* Big quote decorative mark — background element */}
      {isBigQuote && (
        <div style={{ position: 'absolute', top: `${-10 * sc}px`, left: `${44 * sc}px`, fontSize: `${160 * sc}px`, lineHeight: 1, color: Brand.colors.accent_primary, opacity: 0.12, fontFamily: 'Georgia, serif', fontWeight: 900, zIndex: 0, pointerEvents: 'none', userSelect: 'none' as const }}>"</div>
      )}

      {/* Content — vertically centered, with optional text offset */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: `${PV}px ${PH}px`, paddingBottom: `${16 * sc}px`,
        position: 'relative', gap: `${22 * sc}px`,
        overflow: 'hidden', minHeight: 0,
        ...(txOff || tyOff ? { transform: `translate(${txOff}px, ${tyOff}px)` } : {}),
      }}>

        {/* Section label */}
        {slide.section_label && <SectionLabel label={slide.section_label} sc={sc} />}

        {/* Headline — hidden when replaced by custom text overlays */}
        {!slide.useTextOverlays && (
        <div style={{ flexShrink: 0 }}>
          {paras.map((p, i) => (
            <p key={i} style={{
              margin: 0, marginBottom: i < paras.length - 1 ? `${14 * sc}px` : 0,
              fontSize: `${fs}px`, fontWeight: Brand.typography.weights.heading,
              color: Brand.colors.text_primary, lineHeight: isBigQuote ? 1.3 : 1.28, letterSpacing: '-0.025em',
              ...(isBigQuote ? { fontStyle: 'italic' as const } : {}),
            }}>
              {renderWithAccent(p, slide.accent_word)}
            </p>
          ))}
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
                      <span style={{ color: Brand.colors.accent_primary, fontSize: `${11 * sc}px`, fontWeight: 700 }}>→</span>
                      <span style={{ color: Brand.colors.text_muted, fontSize: `${11 * sc}px`, fontWeight: 500, fontStyle: 'italic' as const }}>{v.instruction}</span>
                    </div>
                  )}
                  <div style={{ backgroundColor: Brand.colors.bg_surface, borderRadius: `${12 * sc}px`, overflow: 'hidden', border: `1px solid ${Brand.colors.code_border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: `${6 * sc}px`, padding: `${9 * sc}px ${14 * sc}px`, backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${Brand.colors.divider}` }}>
                      {['#FF5F56', '#FFBD2E', '#27C93F'].map((c, i) => <div key={i} style={{ width: `${9 * sc}px`, height: `${9 * sc}px`, borderRadius: '50%', backgroundColor: c }} />)}
                      <span style={{ marginLeft: `${8 * sc}px`, fontSize: `${9 * sc}px`, color: Brand.colors.text_muted, fontFamily: Brand.typography.mono_font }}>{v.language || 'prompt'}</span>
                    </div>
                    <div style={{ padding: `${14 * sc}px ${16 * sc}px`, fontFamily: Brand.typography.mono_font, fontSize: `${11 * sc}px`, lineHeight: 1.65 }}>
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
                        <div style={{ fontSize: `${11 * sc}px`, color: Brand.colors.text_muted, textTransform: 'uppercase' as const, letterSpacing: '0.07em', fontWeight: 600 }}>{s.label}</div>
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
                    <div style={{ textAlign: 'center', fontSize: `${11 * sc}px`, color: Brand.colors.text_muted, marginBottom: `${14 * sc}px`, textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 600 }}>
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
                            fill={c.text} fontSize={14 * sc}
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
                        <div style={{ fontSize: `${18 * sc}px`, fontWeight: 700, color: Brand.colors.text_primary, marginBottom: `${6 * sc}px`, lineHeight: 1.25 }}>{s.title}</div>
                        <div style={{ fontSize: `${14 * sc}px`, color: Brand.colors.text_muted, lineHeight: 1.5 }}>{s.desc}</div>
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
                        <div style={{ fontSize: `${18 * sc}px`, fontWeight: 700, color: Brand.colors.text_primary }}>{v.name}</div>
                        <div style={{ fontSize: `${12 * sc}px`, color: Brand.colors.text_muted, marginTop: `${2 * sc}px` }}>{v.source}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', background: Brand.colors.bg_surface, borderRadius: `${6 * sc}px`, padding: `${4 * sc}px ${10 * sc}px`, fontSize: `${10 * sc}px`, color: Brand.colors.text_muted, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{v.category}</div>
                    </div>
                  </div>
                  {v.description && <p style={{ fontSize: `${13 * sc}px`, color: Brand.colors.text_muted, lineHeight: 1.5, margin: 0, textAlign: 'center' }}>{v.description}</p>}
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
                    <p style={{ margin: 0, fontSize: `${14 * sc}px`, color: Brand.colors.text_muted, lineHeight: 1.5 }}>{v.supporting}</p>
                  )}
                </div>
              );
            })()}

            {/* COMPARISON — 2-column before/after grid */}
            {slide.visual.type === 'comparison' && (() => {
              const v = slide.visual as ComparisonVisual;
              const colStyle = (isAfter: boolean): React.CSSProperties => ({
                flex: 1, display: 'flex', flexDirection: 'column', gap: `${6 * sc}px`,
              });
              const headerColor = { before: '#F87171', after: '#4ADE80' };
              const itemBg = { before: 'rgba(248,113,113,0.07)', after: 'rgba(74,222,128,0.07)' };
              const itemBorder = { before: 'rgba(248,113,113,0.15)', after: 'rgba(74,222,128,0.15)' };
              const markColor = { before: '#F87171', after: '#4ADE80' };
              return (
                <div style={{ display: 'flex', gap: `${12 * sc}px` }}>
                  {(['before', 'after'] as const).map(side => {
                    const items = side === 'before' ? (v.before_items || []) : (v.after_items || []);
                    const label = side === 'before' ? (v.before_label || '❌ Without AI') : (v.after_label || '✅ With AI');
                    return (
                      <div key={side} style={colStyle(side === 'after')}>
                        <div style={{ fontSize: `${11 * sc}px`, fontWeight: 700, color: headerColor[side], letterSpacing: '0.04em', marginBottom: `${4 * sc}px`, lineHeight: 1.3 }}>{label}</div>
                        {items.map((item, i) => (
                          <div key={i} style={{ display: 'flex', gap: `${7 * sc}px`, alignItems: 'flex-start', backgroundColor: itemBg[side], borderRadius: `${5 * sc}px`, padding: `${7 * sc}px ${8 * sc}px`, border: `1px solid ${itemBorder[side]}` }}>
                            <span style={{ color: markColor[side], fontSize: `${9 * sc}px`, flexShrink: 0, marginTop: `${1 * sc}px`, fontWeight: 700 }}>{side === 'before' ? '✕' : '✓'}</span>
                            <span style={{ fontSize: `${11 * sc}px`, color: side === 'before' ? Brand.colors.text_muted : Brand.colors.text_primary, lineHeight: 1.35 }}>{item}</span>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: `${14 * sc}px` }}>
                  {(v.items || []).map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: `${14 * sc}px`, alignItems: 'center' }}>
                      <div style={{ width: `${28 * sc}px`, height: `${28 * sc}px`, borderRadius: '50%', background: Brand.colors.accent_primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: `${14 * sc}px`, color: 'white', fontWeight: 800 }}>✓</div>
                      <span style={{ fontSize: `${16 * sc}px`, color: Brand.colors.text_primary, lineHeight: 1.4 }}>{item.text}</span>
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

// SimpliScale Brand System — Single source of truth for all carousel styling
// Used by SlideRenderer and carousel generation APIs

export const Brand = {
  colors: {
    bg_primary: '#1A1A1A',           // Dark charcoal — carousel backgrounds (#1A1A1A per brand spec)
    bg_surface: '#282828',           // Cards, code blocks, containers
    bg_overlay: 'rgba(0,0,0,0.55)', // Photo overlays on cover slides
    accent_primary: '#FF7107',       // Tangerine — the brand orange
    accent_secondary: '#FFC26B',     // Sunrise yellow — gradient end, subtle highlights
    text_primary: '#F9F9FB',         // Dim white — headlines and body
    text_muted: '#C4C4C4',           // Cool gray — secondary text, footer
    divider: 'rgba(255,255,255,0.12)',
    code_border: 'rgba(255,255,255,0.07)',
    star: '#FF7107',
  },

  typography: {
    // Use CSS variables so inline styles resolve to Next.js self-hosted woff2 files
    // (the @font-face uses internal names like __Plus_Jakarta_Sans_3c98db, not the original name).
    font_family: 'var(--font-plus-jakarta-sans), var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
    mono_font: 'var(--font-jetbrains-mono), "Courier New", monospace',
    weights: {
      heading: 800,    // ExtraBold — all H1 slide headlines
      subheading: 700, // Bold — section labels, sub-titles
      body: 400,       // Regular — description text
      label: 500,      // Medium — eyebrows, tags, footer text
      semibold: 600,
    },
  },

  brand: {
    save_cta: '🔖 save for later',
  },

} as const;

export type BrandColors = typeof Brand.colors;
export type BrandTypography = typeof Brand.typography;

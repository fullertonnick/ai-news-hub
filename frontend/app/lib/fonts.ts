// ─── Available fonts for text overlays ──────────────────────────────────────

export interface FontOption {
  label: string;
  family: string;          // CSS font-family value
  preview?: string;        // optional preview text style
}

// CSS var() references ensure text overlays use the Next.js self-hosted woff2 files
// (the @font-face uses internal names; var() resolves at render time → html-to-image embeds correctly).
export const FONT_OPTIONS: FontOption[] = [
  { label: 'Sans (Default)', family: 'var(--font-plus-jakarta-sans), system-ui, -apple-system, sans-serif' },
  { label: 'Inter', family: 'var(--font-inter), system-ui, sans-serif' },
  { label: 'Bold Display', family: 'var(--font-archivo-black), Impact, sans-serif' },
  { label: 'Mono', family: 'var(--font-jetbrains-mono), ui-monospace, monospace' },
  { label: 'Serif', family: 'Georgia, "Times New Roman", serif' },
  { label: 'Handwriting', family: 'var(--font-caveat), "Brush Script MT", cursive' },
  { label: 'Modern', family: 'var(--font-dm-sans), system-ui, sans-serif' },
  { label: 'Editorial', family: 'var(--font-playfair-display), Georgia, serif' },
];

export const DEFAULT_FONT_FAMILY = FONT_OPTIONS[0].family;

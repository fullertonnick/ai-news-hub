// ─── Available fonts for text overlays ──────────────────────────────────────

export interface FontOption {
  label: string;
  family: string;          // CSS font-family value
  preview?: string;        // optional preview text style
}

export const FONT_OPTIONS: FontOption[] = [
  { label: 'Sans (Default)', family: 'Plus Jakarta Sans, system-ui, -apple-system, sans-serif' },
  { label: 'Inter', family: 'Inter, system-ui, sans-serif' },
  { label: 'Bold Display', family: 'Archivo Black, Impact, sans-serif' },
  { label: 'Mono', family: 'JetBrains Mono, ui-monospace, monospace' },
  { label: 'Serif', family: 'Georgia, "Times New Roman", serif' },
  { label: 'Handwriting', family: 'Caveat, "Brush Script MT", cursive' },
  { label: 'Modern', family: 'DM Sans, system-ui, sans-serif' },
  { label: 'Editorial', family: 'Playfair Display, Georgia, serif' },
];

export const DEFAULT_FONT_FAMILY = FONT_OPTIONS[0].family;

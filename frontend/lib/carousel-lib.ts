// Shared utilities for carousel API routes

export const FORBIDDEN: Record<string, string> = {
  leverage: 'use', utilize: 'use', synergy: 'teamwork',
  'game-changer': 'breakthrough', 'game changer': 'breakthrough', revolutionary: 'new',
  innovative: 'effective', seamless: 'smooth', empower: 'help',
  disruptive: 'new', 'cutting-edge': 'modern', 'cutting edge': 'modern',
  supercharge: 'boost', revolutionize: 'change', unlock: 'open', paradigm: 'approach',
  delve: 'dig into', streamline: 'simplify', robust: 'solid',
  harness: 'use', actionable: 'concrete', skyrocket: 'grow',
  'next-level': 'better', 'next level': 'better',
};

export function stripForbidden(text: string): string {
  let r = text;
  for (const [bad, good] of Object.entries(FORBIDDEN)) {
    r = r.replace(new RegExp(`\\b${bad.replace(/-/g, '[- ]')}\\b`, 'gi'), good);
  }
  return r;
}

// Ensure accent_word appears verbatim in text; fallback to most impactful phrase.
// Priority: kicker-line content → dollar amounts → numbers+units → tool/file names → arrow sequences → first strong noun.
export function fixAccentWord(text: string, accentWord: string | undefined): string {
  if (!accentWord) return '';
  // Exact substring match (case-insensitive) — the happy path
  if (text.toLowerCase().includes(accentWord.toLowerCase())) return accentWord;
  // Try each word in the accent phrase individually — catches "Claude Code memory" → "Claude Code"
  const accentParts = accentWord.trim().split(/\s+/);
  for (let len = accentParts.length - 1; len >= 1; len--) {
    const sub = accentParts.slice(0, len).join(' ');
    if (sub.length >= 3 && text.toLowerCase().includes(sub.toLowerCase())) return sub;
    const subEnd = accentParts.slice(accentParts.length - len).join(' ');
    if (subEnd.length >= 3 && subEnd !== sub && text.toLowerCase().includes(subEnd.toLowerCase())) return subEnd;
  }
  // Fallback: extract the most impactful phrase from text.
  // Check kicker (last paragraph) first — it's the mic-drop, most likely to be screenshot-worthy.
  const paras = text.split('\n\n').filter(Boolean);
  const kicker = paras.length >= 3 ? paras[paras.length - 1] : null;
  const searchZones = kicker ? [kicker, text] : [text];
  for (const zone of searchZones) {
    const dollar = zone.match(/\$[\d,]+(?:[kKmM])?(?:\/\w+)?/);
    if (dollar) return dollar[0].trim();
    const num = zone.match(/\b\d+(?:\.\d+)?(?:\+)?\s*(?:x\b|%|hrs?|hours?|min(?:utes?)?|sec(?:onds?)?|days?|weeks?|months?|[kKmM]\b)/i);
    if (num) return num[0].trim();
  }
  // File/tool names (case-sensitive match for ALL-CAPS names like CLAUDE.md)
  const toolMatch = text.match(/\b[A-Za-z][A-Za-z0-9]*\.(?:md|json|ts|js|py|sh|txt|yaml|toml)\b/i);
  if (toolMatch) return toolMatch[0];
  const cmdMatch = text.match(/\/[a-z][a-z_-]{2,}/);
  if (cmdMatch) return cmdMatch[0];
  const arrowMatch = text.match(/\w[\w\s]{2,20}(?:\s*→\s*\w[\w\s]{2,15}){2,}/);
  if (arrowMatch) return arrowMatch[0].trim().slice(0, 30);
  const stop = new Set(['their', 'there', 'where', 'every', 'which', 'about', 'after', 'before', 'while', 'doing', 'using', 'start', 'build', 'when', 'from', 'that', 'with', 'your', 'have', 'more', 'this', 'just', 'most', 'also', 'than', 'then', 'what', 'into', 'over', 'them', 'they', 'some', 'never', 'always', 'still', 'right', 'first', 'second']);
  const words = text.split(/\s+/).filter(w => {
    const clean = w.replace(/[^a-zA-Z]/g, '').toLowerCase();
    return clean.length > 4 && !stop.has(clean);
  });
  const candidate = words[0] || accentWord;
  return candidate.replace(/[.,!?;:]$/, '');
}

// Extract the model's actual output text from a Gemini API response.
// When thinking is enabled, Gemini may emit a "thought" part before the actual output.
// This finds the first non-thought part so JSON parsing always targets the real output.
export function extractGeminiText(d: any): string {
  const parts: any[] = d?.candidates?.[0]?.content?.parts || [];
  const outputPart = parts.find((p: any) => !p.thought && p.text != null);
  return outputPart?.text ?? parts[0]?.text ?? '';
}

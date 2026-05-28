// Shared utilities for carousel API routes

export const FORBIDDEN: Record<string, string> = {
  leverage: 'use', utilize: 'use', synergy: 'teamwork',
  'game-changer': 'breakthrough', revolutionary: 'new',
  innovative: 'effective', seamless: 'smooth', empower: 'help',
  disruptive: 'new', 'cutting-edge': 'modern', supercharge: 'boost',
  revolutionize: 'change', unlock: 'open', paradigm: 'approach',
};

export function stripForbidden(text: string): string {
  let r = text;
  for (const [bad, good] of Object.entries(FORBIDDEN)) {
    r = r.replace(new RegExp(`\\b${bad.replace(/-/g, '[- ]')}\\b`, 'gi'), good);
  }
  return r;
}

// Ensure accent_word appears verbatim in text; fallback to most impactful phrase.
// Priority: dollar amounts → numbers+units → tool/file names → arrow sequences → paths → first strong noun.
export function fixAccentWord(text: string, accentWord: string | undefined): string {
  if (!accentWord) return '';
  if (text.toLowerCase().includes(accentWord.toLowerCase())) return accentWord;
  const dollarMatch = text.match(/\$[\d,]+(?:[kKmM])?(?:\/\w+)?/);
  if (dollarMatch) return dollarMatch[0].trim();
  const numMatch = text.match(/\b\d+(?:\.\d+)?(?:x\b|\s*(?:%|hrs?|hours?|min(?:utes?)?|sec(?:onds?)?|days?|weeks?|months?|[kKmM]\b))/i);
  if (numMatch) return numMatch[0].trim();
  const toolMatch = text.match(/\b[A-Z][A-Z0-9]*\.(?:md|json|ts|js|py|sh|txt|yaml|toml)\b/);
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

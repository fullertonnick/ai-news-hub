'use client';
import { useState, useCallback } from 'react';
import { Loader2, Copy, Check, RefreshCw, Video, Zap } from 'lucide-react';

const HOOK_TYPES = ['results claim', 'disruption', 'market reality', 'tool announcement', 'controversial'] as const;
const LENGTHS = ['short (30-45s)', 'medium (45-75s)', 'extended (75-90s)'] as const;
const CTA_TYPES = ['comment', 'link-in-bio', 'DM', 'follow'] as const;

export default function InstagramScriptsPage() {
  const [topic, setTopic] = useState('');
  const [length, setLength] = useState<string>('medium (45-75s)');
  const [hookType, setHookType] = useState<string>('results claim');
  const [ctaType, setCtaType] = useState<string>('comment');
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const r = await fetch('/api/scripts/instagram-reel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, length, hook_type: hookType, cta_type: ctaType }),
      });
      const d = await r.json();
      setScript(d.script || 'Generation failed.');
    } catch { setScript('Generation failed. Check your API key.'); }
    setLoading(false);
  }, [topic, length, hookType, ctaType]);

  const copyScript = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Video size={18} className="text-pink-400" />
          <h3 className="text-sm font-bold text-white">Instagram Reel Script Generator</h3>
        </div>
        <p className="text-xs text-gray-500">Uses your proven short-form framework: Hook → Problem → Solution → Proof → CTA. Punchy, 3-8 words per sentence, zero fluff.</p>

        <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
          placeholder="Topic: e.g. AI agents replacing VAs in 2026"
          className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-pink-500/50"
          onKeyDown={e => e.key === 'Enter' && generate()} />

        <div className="space-y-3">
          <div>
            <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Length</div>
            <div className="flex flex-wrap gap-1.5">
              {LENGTHS.map(l => (
                <button key={l} onClick={() => setLength(l)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${length === l ? 'border-pink-500/40 bg-pink-500/10 text-pink-400' : 'border-white/10 text-gray-500 hover:text-white'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Hook Type</div>
            <div className="flex flex-wrap gap-1.5">
              {HOOK_TYPES.map(h => (
                <button key={h} onClick={() => setHookType(h)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${hookType === h ? 'border-pink-500/40 bg-pink-500/10 text-pink-400' : 'border-white/10 text-gray-500 hover:text-white'}`}>
                  {h}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">CTA Type</div>
            <div className="flex flex-wrap gap-1.5">
              {CTA_TYPES.map(c => (
                <button key={c} onClick={() => setCtaType(c)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${ctaType === c ? 'border-pink-500/40 bg-pink-500/10 text-pink-400' : 'border-white/10 text-gray-500 hover:text-white'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={generate} disabled={loading || !topic.trim()}
          className="w-full bg-pink-500 hover:bg-pink-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
          {loading ? <><Loader2 size={14} className="animate-spin" />Generating Script...</> : <><Zap size={14} />Generate Reel Script</>}
        </button>
      </div>

      {script && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Reel Script</span>
            <div className="flex gap-2">
              <button onClick={generate} className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5"><RefreshCw size={12} />Regenerate</button>
              <button onClick={copyScript} className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5">
                {copied ? <><Check size={12} className="text-green-400" /><span className="text-green-400">Copied!</span></> : <><Copy size={12} />Copy</>}
              </button>
            </div>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
            <pre className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap font-sans">{script}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

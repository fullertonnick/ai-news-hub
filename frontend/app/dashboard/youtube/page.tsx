'use client';
import { useState, useCallback } from 'react';
import { Loader2, Copy, Check, RefreshCw, Youtube, Zap, Image } from 'lucide-react';

const HOOK_TYPES = ['tutorial', 'industry analysis', 'results reveal', 'problem-solution', 'controversial'] as const;
const VIDEO_LENGTHS = ['short (5-8 min)', 'medium (10-15 min)', 'long (15-25 min)'] as const;
const CTA_OPTIONS = ['Automation Academy', 'SimpliScale', 'KingCaller AI'] as const;

type Tab = 'script' | 'thumbnail';

export default function YouTubePage() {
  const [tab, setTab] = useState<Tab>('script');

  // Script state
  const [topic, setTopic] = useState('');
  const [videoLength, setVideoLength] = useState<string>('medium (10-15 min)');
  const [hookType, setHookType] = useState<string>('tutorial');
  const [primaryCTA, setPrimaryCTA] = useState<string>('Automation Academy');
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState('');
  const [copied, setCopied] = useState(false);

  // Thumbnail state
  const [thumbTitle, setThumbTitle] = useState('');
  const [thumbStyle, setThumbStyle] = useState<'face-text' | 'dramatic' | 'before-after'>('face-text');
  const [thumbLoading, setThumbLoading] = useState(false);
  const [thumbImage, setThumbImage] = useState('');

  const generateScript = useCallback(async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const r = await fetch('/api/scripts/youtube', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, length: videoLength, hook_type: hookType, primary_cta: primaryCTA }),
      });
      const d = await r.json();
      setScript(d.script || 'Generation failed.');
    } catch { setScript('Generation failed. Check your API key.'); }
    setLoading(false);
  }, [topic, videoLength, hookType, primaryCTA]);

  const generateThumbnail = useCallback(async () => {
    if (!thumbTitle.trim()) return;
    setThumbLoading(true);
    try {
      const r = await fetch('/api/scripts/youtube-thumbnail', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: thumbTitle, style: thumbStyle }),
      });
      const d = await r.json();
      setThumbImage(d.dataUrl || '');
    } catch { setThumbImage(''); }
    setThumbLoading(false);
  }, [thumbTitle, thumbStyle]);

  const copyScript = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Tab switcher */}
      <div className="flex gap-1.5 bg-white/[0.03] rounded-xl p-1 border border-white/5">
        {[{ id: 'script' as Tab, label: 'Script Writer', icon: Youtube }, { id: 'thumbnail' as Tab, label: 'Thumbnail Generator', icon: Image }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'text-gray-500 hover:text-white'}`}>
            <t.icon size={16} />{t.label}
          </button>
        ))}
      </div>

      {/* Script Tab */}
      {tab === 'script' && (
        <>
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 space-y-4">
            <p className="text-xs text-gray-500">Uses your 5-Phase Framework: Disruption → Declaration → Diagnosis → Download → Directive. Full script with hooks, CTAs, and client stories.</p>

            <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="Topic: e.g. How I built a $70K/month AI business in 4 years"
              className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/50"
              onKeyDown={e => e.key === 'Enter' && generateScript()} />

            <div className="space-y-3">
              <div>
                <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Video Length</div>
                <div className="flex flex-wrap gap-1.5">
                  {VIDEO_LENGTHS.map(l => (
                    <button key={l} onClick={() => setVideoLength(l)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${videoLength === l ? 'border-red-500/40 bg-red-500/10 text-red-400' : 'border-white/10 text-gray-500 hover:text-white'}`}>
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
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${hookType === h ? 'border-red-500/40 bg-red-500/10 text-red-400' : 'border-white/10 text-gray-500 hover:text-white'}`}>
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Primary CTA</div>
                <div className="flex flex-wrap gap-1.5">
                  {CTA_OPTIONS.map(c => (
                    <button key={c} onClick={() => setPrimaryCTA(c)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${primaryCTA === c ? 'border-red-500/40 bg-red-500/10 text-red-400' : 'border-white/10 text-gray-500 hover:text-white'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={generateScript} disabled={loading || !topic.trim()}
              className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={14} className="animate-spin" />Generating Script...</> : <><Zap size={14} />Generate YouTube Script</>}
            </button>
          </div>

          {script && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Script</span>
                <div className="flex gap-2">
                  <button onClick={generateScript} className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5"><RefreshCw size={12} />Regenerate</button>
                  <button onClick={copyScript} className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5">
                    {copied ? <><Check size={12} className="text-green-400" /><span className="text-green-400">Copied!</span></> : <><Copy size={12} />Copy</>}
                  </button>
                </div>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5 max-h-[60vh] overflow-y-auto">
                <pre className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap font-sans">{script}</pre>
              </div>
            </div>
          )}
        </>
      )}

      {/* Thumbnail Tab */}
      {tab === 'thumbnail' && (
        <>
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 space-y-4">
            <p className="text-xs text-gray-500">Generate YouTube thumbnail backgrounds with Imagen 3. Add your text overlay in your editor.</p>

            <input type="text" value={thumbTitle} onChange={e => setThumbTitle(e.target.value)}
              placeholder="Video title: e.g. I Replaced My Sales Team With AI"
              className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/50"
              onKeyDown={e => e.key === 'Enter' && generateThumbnail()} />

            <div>
              <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Style</div>
              <div className="flex flex-wrap gap-1.5">
                {[{ id: 'face-text' as const, label: 'Face + Text' }, { id: 'dramatic' as const, label: 'Dramatic Scene' }, { id: 'before-after' as const, label: 'Before/After' }].map(s => (
                  <button key={s.id} onClick={() => setThumbStyle(s.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${thumbStyle === s.id ? 'border-red-500/40 bg-red-500/10 text-red-400' : 'border-white/10 text-gray-500 hover:text-white'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={generateThumbnail} disabled={thumbLoading || !thumbTitle.trim()}
              className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
              {thumbLoading ? <><Loader2 size={14} className="animate-spin" />Generating...</> : <><Image size={14} />Generate Thumbnail</>}
            </button>
          </div>

          {thumbImage && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Thumbnail Preview (16:9)</span>
              <div className="rounded-xl overflow-hidden border border-white/10">
                <img src={thumbImage} alt="Thumbnail" className="w-full aspect-video object-cover" />
              </div>
              <a href={thumbImage} download="youtube-thumbnail.png"
                className="block w-full text-center bg-white/5 hover:bg-white/10 text-white text-sm font-medium py-2.5 rounded-xl border border-white/10 transition-colors">
                Download Thumbnail
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}

'use client';
import { useState, useCallback } from 'react';
import { Loader2, Copy, Check, RefreshCw, Twitter, Zap } from 'lucide-react';

export default function XPostPage() {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<'authority' | 'contrarian' | 'educational' | 'results'>('authority');
  const [format, setFormat] = useState<'single' | 'thread'>('single');
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<string[]>([]);
  const [copied, setCopied] = useState<number | null>(null);

  const generate = useCallback(async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const r = await fetch('/api/x/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, tone, format }),
      });
      const d = await r.json();
      setPosts(d.posts || [d.text || '']);
    } catch { setPosts(['Generation failed. Check your API key in settings.']); }
    setLoading(false);
  }, [topic, tone, format]);

  const copyPost = (i: number) => {
    navigator.clipboard.writeText(posts[i]);
    setCopied(i);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Input */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Twitter size={18} className="text-blue-400" />
          <h3 className="text-sm font-bold text-white">Generate X Post</h3>
        </div>
        <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
          placeholder="Topic: e.g. Why AI agents beat hiring in 2026"
          className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500/50"
          onKeyDown={e => e.key === 'Enter' && generate()} />

        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1.5">
            {(['authority', 'contrarian', 'educational', 'results'] as const).map(t => (
              <button key={t} onClick={() => setTone(t)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${tone === t ? 'border-blue-500/40 bg-blue-500/10 text-blue-400' : 'border-white/10 text-gray-500 hover:text-white'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 ml-auto">
            {(['single', 'thread'] as const).map(f => (
              <button key={f} onClick={() => setFormat(f)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${format === f ? 'border-blue-500/40 bg-blue-500/10 text-blue-400' : 'border-white/10 text-gray-500 hover:text-white'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <button onClick={generate} disabled={loading || !topic.trim()}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
          {loading ? <><Loader2 size={14} className="animate-spin" />Generating...</> : <><Zap size={14} />Generate Post</>}
        </button>
      </div>

      {/* Output */}
      {posts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{posts.length > 1 ? 'Thread' : 'Post'}</span>
            <button onClick={generate} className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5">
              <RefreshCw size={12} />Regenerate
            </button>
          </div>
          {posts.map((post, i) => (
            <div key={i} className="rounded-xl bg-white/[0.03] border border-white/10 p-4 relative group">
              {posts.length > 1 && <div className="text-[10px] text-gray-600 font-bold mb-2">{i + 1}/{posts.length}</div>}
              <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{post}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <span className={`text-xs ${post.length > 280 ? 'text-red-400' : 'text-gray-600'}`}>{post.length}/280</span>
                <button onClick={() => copyPost(i)} className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors">
                  {copied === i ? <><Check size={12} className="text-green-400" /><span className="text-green-400">Copied!</span></> : <><Copy size={12} />Copy</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

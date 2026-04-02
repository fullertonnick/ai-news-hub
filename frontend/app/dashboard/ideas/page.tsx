'use client';
import { useState, useCallback, useEffect } from 'react';
import { Loader2, Lightbulb, Zap, Trash2, Archive, X } from 'lucide-react';

interface SavedIdea { id: string; platform: string; title: string; description: string; tags: string[]; created_at: string; status: string; }

const PLATFORMS = ['all', 'instagram_carousel', 'instagram_reel', 'x', 'youtube', 'linkedin', 'skool'] as const;
const PLATFORM_LABELS: Record<string, string> = {
  all: 'All Platforms', instagram_carousel: 'IG Carousel', instagram_reel: 'IG Reel',
  x: 'X / Twitter', youtube: 'YouTube', linkedin: 'LinkedIn', skool: 'Skool',
};

export default function IdeasPage() {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('all');
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<SavedIdea[]>([]);
  const [generated, setGenerated] = useState<{ title: string; description: string; platform: string }[]>([]);

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('simpliscale_ideas');
    if (stored) setIdeas(JSON.parse(stored));
  }, []);

  const saveIdeas = (updated: SavedIdea[]) => {
    setIdeas(updated);
    localStorage.setItem('simpliscale_ideas', JSON.stringify(updated));
  };

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/ideas/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic || undefined, platform: platform === 'all' ? undefined : platform }),
      });
      const d = await r.json();
      setGenerated(d.ideas || []);
    } catch { setGenerated([]); }
    setLoading(false);
  }, [topic, platform]);

  const saveIdea = (idea: { title: string; description: string; platform: string }) => {
    const newIdea: SavedIdea = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ...idea, tags: [], created_at: new Date().toISOString(), status: 'new',
    };
    saveIdeas([newIdea, ...ideas]);
    setGenerated(prev => prev.filter(g => g.title !== idea.title));
  };

  const deleteIdea = (id: string) => saveIdeas(ideas.filter(i => i.id !== id));
  const archiveIdea = (id: string) => saveIdeas(ideas.map(i => i.id === id ? { ...i, status: 'archived' } : i));

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Generator */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb size={18} className="text-yellow-400" />
          <h3 className="text-sm font-bold text-white">Idea Engine</h3>
        </div>
        <p className="text-xs text-gray-500">Generate content ideas across all your platforms. Leave topic blank for trending AI ideas.</p>

        <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
          placeholder="Optional focus: e.g. automation, Claude, Make.com"
          className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-yellow-500/50"
          onKeyDown={e => e.key === 'Enter' && generate()} />

        <div>
          <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Platform</div>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map(p => (
              <button key={p} onClick={() => setPlatform(p)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${platform === p ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400' : 'border-white/10 text-gray-500 hover:text-white'}`}>
                {PLATFORM_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        <button onClick={generate} disabled={loading}
          className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-40 text-black font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
          {loading ? <><Loader2 size={14} className="animate-spin" />Generating Ideas...</> : <><Zap size={14} />Generate 5 Ideas</>}
        </button>
      </div>

      {/* Generated ideas */}
      {generated.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">New Ideas — click to save</span>
          {generated.map((idea, i) => (
            <button key={i} onClick={() => saveIdea(idea)}
              className="w-full text-left rounded-xl bg-yellow-500/5 border border-yellow-500/15 p-4 hover:bg-yellow-500/10 transition-all">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full uppercase font-bold">{PLATFORM_LABELS[idea.platform] || idea.platform}</span>
              </div>
              <div className="text-sm font-semibold text-white">{idea.title}</div>
              <div className="text-xs text-gray-400 mt-1">{idea.description}</div>
            </button>
          ))}
        </div>
      )}

      {/* Saved ideas */}
      {ideas.filter(i => i.status !== 'archived').length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Saved Ideas ({ideas.filter(i => i.status !== 'archived').length})</span>
          {ideas.filter(i => i.status !== 'archived').map(idea => (
            <div key={idea.id} className="rounded-xl bg-white/[0.03] border border-white/10 p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded-full uppercase font-bold">{PLATFORM_LABELS[idea.platform] || idea.platform}</span>
                </div>
                <div className="text-sm font-semibold text-white">{idea.title}</div>
                <div className="text-xs text-gray-400 mt-1">{idea.description}</div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => archiveIdea(idea.id)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-600 hover:text-white transition-colors"><Archive size={14} /></button>
                <button onClick={() => deleteIdea(idea.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

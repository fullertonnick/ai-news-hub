'use client';
import { useState } from 'react';
import { TrendingUp, Flame, RefreshCw, Zap } from 'lucide-react';
import { TrendingTopic } from '../types';

interface Props { topics: TrendingTopic[]; onTopicClick: (t: string) => void; onGenerateCarousel: (t: string) => void; onRefresh: () => void; activeFilter: string | null; }

export default function TrendingSidebar({ topics, onTopicClick, onGenerateCarousel, onRefresh, activeFilter }: Props) {
  const [custom, setCustom] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => { setRefreshing(true); await onRefresh(); setTimeout(() => setRefreshing(false), 800); };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp size={14} className="text-brand-orange" />Trending Topics
          </h3>
          <button onClick={handleRefresh} disabled={refreshing} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-600 hover:text-gray-400 transition-colors">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="p-2">
          {topics.length === 0 ? <div className="py-6 text-center text-gray-600 text-sm">Loading trends...</div> : topics.map((t, i) => (
            <div key={t.topic} className="group relative">
              <button onClick={() => onTopicClick(t.topic)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left ${activeFilter === t.topic ? 'bg-brand-orange/15 border border-brand-orange/30' : 'hover:bg-white/5 border border-transparent'}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xs font-bold w-5 text-center flex-shrink-0" style={{ color: i < 3 ? '#FF6B35' : '#4B5563' }}>{i+1}</span>
                  <span className={`text-sm font-medium truncate ${activeFilter === t.topic ? 'text-brand-orange' : 'text-gray-300'}`}>{t.topic}</span>
                  {t.hot && <Flame size={12} className="text-orange-500 flex-shrink-0" />}
                </div>
                <span className="text-xs text-gray-600 bg-white/5 px-1.5 py-0.5 rounded-md flex-shrink-0 ml-2">{t.count}</span>
              </button>
              <button onClick={() => onGenerateCarousel(t.topic)} className="absolute right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-brand-orange text-white text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1">
                <Zap size={10} />Carousel
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-3">
          <Zap size={14} className="text-brand-orange" />Custom Carousel
        </h3>
        <form onSubmit={e => { e.preventDefault(); if (custom.trim()) { onGenerateCarousel(custom.trim()); setCustom(''); }}} className="space-y-2">
          <input type="text" value={custom} onChange={e => setCustom(e.target.value)} placeholder="e.g. Claude Code automation..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-orange/50 transition-colors" />
          <button type="submit" disabled={!custom.trim()} className="w-full bg-brand-orange hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
            <Zap size={14} />Generate Carousel
          </button>
        </form>
        <p className="text-xs text-gray-600 mt-2">Turn any AI topic into a shareable Instagram carousel.</p>
      </div>
      <div className="rounded-2xl border border-brand-orange/20 bg-brand-orange/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: 'linear-gradient(135deg, #FF6B35, #FF8C5A)' }}>NC</div>
          <div><p className="text-sm font-semibold text-white">Nick Cornelius</p><p className="text-xs text-gray-500">@thenickcornelius</p></div>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">$70k/month AI agency. Sharing what actually works — no theory, just systems.</p>
      </div>
    </div>
  );
}

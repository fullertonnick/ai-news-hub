'use client';
import { useState } from 'react';
import { MessageCircle, ExternalLink, Zap, Clock, Flame } from 'lucide-react';
import { NewsItem } from '../types';

interface Props { item: NewsItem; onGenerateCarousel: (t: string) => void; onTopicClick: (t: string) => void; }

const SOURCE_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  HackerNews: { bg: 'bg-orange-500/15', text: 'text-orange-400', dot: 'bg-orange-500' },
  Reddit: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-500' },
  'DEV.to': { bg: 'bg-purple-500/15', text: 'text-purple-400', dot: 'bg-purple-500' },
  ProductHunt: { bg: 'bg-pink-500/15', text: 'text-pink-400', dot: 'bg-pink-500' },
};

function timeAgo(d: string) {
  try {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff/60000), h = Math.floor(m/60), dy = Math.floor(h/24);
    if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`; if (dy < 7) return `${dy}d ago`;
    return new Date(d).toLocaleDateString();
  } catch { return 'recently'; }
}

export default function NewsCard({ item, onGenerateCarousel, onTopicClick }: Props) {
  const [hovered, setHovered] = useState(false);
  const s = SOURCE_STYLES[item.source] || SOURCE_STYLES.HackerNews;
  const scoreColor = item.trending_score >= 80 ? '#FF6B35' : item.trending_score >= 60 ? '#f59e0b' : '#6b7280';
  return (
    <div className="group relative rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-200 overflow-hidden"
      style={{ transform: hovered ? 'translateY(-1px)' : 'translateY(0)', transition: 'transform 0.2s ease, background 0.2s ease' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="absolute top-0 left-0 h-0.5 bg-white/5 w-full">
        <div className="h-full rounded-full" style={{ width: `${item.trending_score}%`, backgroundColor: scoreColor }} />
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{item.source}
            </span>
            {item.trending_score >= 75 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
                <Flame size={10} />Hot
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <span className="flex items-center gap-1"><Clock size={11} />{timeAgo(item.published_at)}</span>
            {item.comments > 0 && <span className="flex items-center gap-1"><MessageCircle size={11} />{item.comments > 999 ? `${Math.floor(item.comments/1000)}k` : item.comments}</span>}
          </div>
        </div>
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
          <h3 className="text-white font-semibold text-base leading-snug mb-2 hover:text-brand-orange transition-colors line-clamp-2">{item.title}</h3>
        </a>
        {item.summary && <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-3">{item.summary}</p>}
        {item.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.topics.slice(0,4).map(t => (
              <button key={t} onClick={() => onTopicClick(t)} className="text-xs text-gray-500 bg-white/5 hover:bg-white/10 hover:text-gray-300 px-2 py-0.5 rounded-md transition-colors">#{t}</button>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors">
            <ExternalLink size={12} />Read full story
          </a>
          <button onClick={() => onGenerateCarousel(item.title)} className="flex items-center gap-1.5 text-xs font-semibold text-brand-orange hover:text-orange-400 bg-brand-orange/10 hover:bg-brand-orange/20 px-3 py-1.5 rounded-lg transition-all">
            <Zap size={12} />Generate Carousel
          </button>
        </div>
      </div>
    </div>
  );
}

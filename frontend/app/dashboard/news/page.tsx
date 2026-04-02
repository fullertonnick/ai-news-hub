'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Zap, RefreshCw, Search, X, TrendingUp, Loader2 } from 'lucide-react';
import NewsCard from '../../components/NewsCard';
import TrendingSidebar from '../../components/TrendingSidebar';
import CarouselGenerator from '../../components/CarouselGenerator';
import { NewsItem, TrendingTopic } from '../../types';

export default function Home() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [carouselTopic, setCarouselTopic] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const fetchNews = useCallback(async (pageNum: number, filter: string | null, reset = false) => {
    try {
      const params = new URLSearchParams({ limit: '20', offset: String(pageNum * 20) });
      if (filter) params.set('topic', filter);
      const r = await fetch(`/api/news?${params}`);
      const d = await r.json();
      const items: NewsItem[] = d.items || [];
      if (reset) { setNews(items); } else { setNews(prev => [...prev, ...items]); }
      setHasMore(d.has_more ?? items.length === 20);
    } catch { console.error('Failed to fetch news'); }
  }, []);

  const fetchTopics = useCallback(async () => {
    try {
      const r = await fetch('/api/trending');
      const d = await r.json();
      setTopics(d.topics || []);
    } catch { console.error('Failed to fetch topics'); }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchNews(0, null, true), fetchTopics()]);
      setLoading(false);
    };
    init();
  }, [fetchNews, fetchTopics]);

  const handleTopicClick = useCallback((t: string) => {
    const newFilter = activeFilter === t ? null : t;
    setActiveFilter(newFilter);
    setPage(0);
    setNews([]);
    fetchNews(0, newFilter, true);
  }, [activeFilter, fetchNews]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchNews(nextPage, activeFilter);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, activeFilter, fetchNews]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(0);
    await Promise.all([fetchNews(0, activeFilter, true), fetchTopics()]);
    setRefreshing(false);
  }, [fetchNews, fetchTopics, activeFilter]);

  const filtered = search.trim()
    ? news.filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || n.summary?.toLowerCase().includes(search.toLowerCase()) || n.topics.some(t => t.toLowerCase().includes(search.toLowerCase())))
    : news;

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-black/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0" style={{ background: 'linear-gradient(135deg, #FF6B35, #FF8C5A)' }}>NC</div>
            <div>
              <div className="text-white font-bold text-base leading-none">AI News Hub</div>
              <div className="text-gray-600 text-xs mt-0.5">by @thenickcornelius</div>
            </div>
          </div>
          <div className="flex-1 max-w-sm relative hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search AI news..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-orange/50 transition-colors"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white"><X size={14} /></button>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} disabled={refreshing} className="p-2 rounded-xl border border-white/10 hover:border-white/20 text-gray-500 hover:text-white transition-colors">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setCarouselTopic('AI Business Systems')} className="flex items-center gap-2 bg-brand-orange hover:bg-orange-500 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors">
              <Zap size={14} />Carousel
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Feed */}
          <div className="flex-1 min-w-0">
            {/* Filter bar */}
            {activeFilter && (
              <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-brand-orange/10 border border-brand-orange/20">
                <TrendingUp size={14} className="text-brand-orange" />
                <span className="text-brand-orange text-sm font-medium">Filtered: {activeFilter}</span>
                <button onClick={() => handleTopicClick(activeFilter)} className="ml-auto text-brand-orange/60 hover:text-brand-orange"><X size={14} /></button>
              </div>
            )}

            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
                    <div className="flex gap-2"><div className="skeleton h-5 w-20 rounded-full" /><div className="skeleton h-5 w-12 rounded-full" /></div>
                    <div className="skeleton h-5 w-full rounded-lg" />
                    <div className="skeleton h-4 w-3/4 rounded-lg" />
                    <div className="flex gap-2 mt-2"><div className="skeleton h-4 w-16 rounded" /><div className="skeleton h-4 w-16 rounded" /></div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🤖</div>
                <div className="text-white font-semibold text-lg mb-2">No news found</div>
                <div className="text-gray-500 text-sm">{search ? 'Try a different search term' : 'Pull to refresh'}</div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {filtered.map(item => (
                    <NewsCard key={item.id} item={item} onGenerateCarousel={setCarouselTopic} onTopicClick={handleTopicClick} />
                  ))}
                </div>
                {!search && hasMore && (
                  <div ref={loaderRef} className="mt-6 flex justify-center">
                    <button onClick={handleLoadMore} disabled={loadingMore} className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:border-white/20 text-gray-400 hover:text-white text-sm font-medium transition-all">
                      {loadingMore ? <><Loader2 size={14} className="animate-spin" />Loading...</> : 'Load More'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-72 flex-shrink-0 hidden lg:block">
            <div className="sticky top-24">
              <TrendingSidebar
                topics={topics}
                onTopicClick={handleTopicClick}
                onGenerateCarousel={setCarouselTopic}
                onRefresh={handleRefresh}
                activeFilter={activeFilter}
              />
            </div>
          </aside>
        </div>
      </main>

      {carouselTopic && <CarouselGenerator topic={carouselTopic} onClose={() => setCarouselTopic(null)} />}
    </div>
  );
}

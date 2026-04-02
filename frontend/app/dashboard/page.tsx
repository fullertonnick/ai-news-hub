'use client';
import Link from 'next/link';
import { Image, Twitter, Video, Youtube, Lightbulb, Newspaper, ArrowRight } from 'lucide-react';

const TOOLS = [
  { label: 'Carousels', desc: 'Generate Instagram carousels with AI backgrounds', href: '/dashboard/carousel', icon: Image, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  { label: 'X Posts', desc: 'Write and preview tweets in your voice', href: '/dashboard/x', icon: Twitter, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { label: 'IG Reel Scripts', desc: 'Punchy reel scripts using your framework', href: '/dashboard/instagram-scripts', icon: Video, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  { label: 'YouTube Studio', desc: 'Scripts + thumbnails for YouTube', href: '/dashboard/youtube', icon: Youtube, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  { label: 'Idea Engine', desc: 'Generate content ideas across all platforms', href: '/dashboard/ideas', icon: Lightbulb, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  { label: 'News Feed', desc: 'Trending AI news for content inspiration', href: '/dashboard/news', icon: Newspaper, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
];

export default function DashboardOverview() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Welcome */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-orange/10 to-transparent border border-brand-orange/20 p-6">
        <h2 className="text-2xl font-bold text-white mb-1">Command Center</h2>
        <p className="text-gray-400 text-sm">Your AI-powered content machine. Generate, schedule, and distribute across every platform.</p>
      </div>

      {/* Tool grid */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Content Tools</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TOOLS.map(tool => {
            const Icon = tool.icon;
            return (
              <Link key={tool.href} href={tool.href}
                className={`group rounded-xl ${tool.bg} border ${tool.border} p-4 hover:border-white/20 transition-all`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center ${tool.color}`}>
                    <Icon size={20} />
                  </div>
                  <ArrowRight size={14} className="text-gray-600 group-hover:text-white transition-colors mt-1" />
                </div>
                <div className="text-sm font-bold text-white mb-1">{tool.label}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{tool.desc}</div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Coming soon */}
      <div className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Coming Soon</h3>
        <div className="flex flex-wrap gap-2">
          {['LinkedIn Automation', 'Skool Posts', 'Content Queue', 'Analytics', 'Content Calendar'].map(item => (
            <span key={item} className="text-xs text-gray-600 bg-white/5 px-3 py-1.5 rounded-full">{item}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

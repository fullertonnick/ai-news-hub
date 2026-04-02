'use client';
import { useState } from 'react';
import CarouselGenerator from '../../components/CarouselGenerator';

export default function CarouselPage() {
  const [topic, setTopic] = useState('');
  const [activeTopic, setActiveTopic] = useState('');

  return (
    <div className="h-full flex flex-col">
      {!activeTopic ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-white">Instagram Carousel Generator</h2>
              <p className="text-sm text-gray-500">Enter a topic to generate a 5-slide carousel with AI backgrounds, captions, and brand styling.</p>
            </div>
            <form onSubmit={e => { e.preventDefault(); if (topic.trim()) setActiveTopic(topic.trim()); }} className="space-y-3">
              <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Make.com automating client onboarding"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-brand-orange/50" />
              <button type="submit" disabled={!topic.trim()}
                className="w-full bg-brand-orange hover:bg-orange-500 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors text-sm">
                Generate Carousel
              </button>
            </form>
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-600 uppercase tracking-widest">Quick Topics</div>
              {['Claude Code memory files', 'Make.com automating client onboarding', 'AI agents replacing manual data entry', 'Using ChatGPT to save 20 hours a week'].map(t => (
                <button key={t} onClick={() => { setTopic(t); setActiveTopic(t); }}
                  className="block w-full text-left text-xs text-gray-400 hover:text-brand-orange px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-brand-orange/5 border border-white/5 hover:border-brand-orange/20 transition-all">
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <CarouselGenerator topic={activeTopic} onClose={() => setActiveTopic('')} />
      )}
    </div>
  );
}

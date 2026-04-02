'use client';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-gray-400" />
          <h3 className="text-sm font-bold text-white">Configuration</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Gemini API Key</label>
            <p className="text-xs text-gray-600 mb-1">Used for Imagen 3 backgrounds and content generation. Set in Vercel environment variables.</p>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-xs text-green-400 font-mono">
              {typeof window !== 'undefined' ? '••••••••••••••••••••' : ''} (set via Vercel env)
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">VPS URL (Phase 2)</label>
            <p className="text-xs text-gray-600 mb-1">Contabo VPS for LinkedIn automation and content scheduling.</p>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-xs text-gray-600 font-mono">
              Not configured — Phase 2
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">X API Credentials (Phase 2)</label>
            <p className="text-xs text-gray-600 mb-1">Required for scheduled posting to X/Twitter.</p>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-xs text-gray-600 font-mono">
              Not configured — Phase 2
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Platform</h3>
        <div className="space-y-2 text-xs text-gray-400">
          <div className="flex justify-between"><span>Version</span><span className="text-white font-mono">1.0.0</span></div>
          <div className="flex justify-between"><span>Brand</span><span className="text-brand-orange font-semibold">SimpliScale</span></div>
          <div className="flex justify-between"><span>Framework</span><span className="text-white font-mono">Next.js 14</span></div>
          <div className="flex justify-between"><span>AI Stack</span><span className="text-white font-mono">Gemini + Imagen 3</span></div>
        </div>
      </div>
    </div>
  );
}

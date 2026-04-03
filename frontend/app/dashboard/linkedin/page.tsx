'use client';
import { useState, useCallback, useEffect } from 'react';
import { Linkedin, Plus, Play, Pause, Trash2, Users, Eye, UserPlus, MessageSquare, Loader2, AlertCircle, CheckCircle, Settings } from 'lucide-react';

interface Campaign {
  id: string; name: string; status: string; search_url: string;
  sequence: { action: string; delay_hours: number; template?: string }[];
  daily_limit: number; stats: Record<string, number>; created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  view_profile: { label: 'View Profile', icon: Eye, color: 'text-blue-400' },
  connect: { label: 'Connect', icon: UserPlus, color: 'text-green-400' },
  message: { label: 'Message', icon: MessageSquare, color: 'text-purple-400' },
  follow: { label: 'Follow', icon: Users, color: 'text-cyan-400' },
  endorse: { label: 'Endorse', icon: CheckCircle, color: 'text-yellow-400' },
  like: { label: 'Like Post', icon: CheckCircle, color: 'text-pink-400' },
};

const DEFAULT_SEQUENCE = [
  { action: 'view_profile', delay_hours: 0 },
  { action: 'connect', delay_hours: 24, template: 'Hey {{name}}, I saw you\'re in {{company}}. I help service businesses automate with AI — would love to connect.' },
  { action: 'message', delay_hours: 72, template: 'Hey {{name}}, thanks for connecting! Quick question — are you using any AI automation in your business yet? I\'ve been helping companies like {{company}} save 15-20 hrs/week with systems I built. Happy to share what\'s working if you\'re interested.', condition: 'if_connected' },
];

export default function LinkedInPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [vpsStatus, setVpsStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [linkedinStatus, setLinkedInStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSearchUrl, setNewSearchUrl] = useState('');
  const [error, setError] = useState('');

  // Check VPS health
  const checkVPS = useCallback(async () => {
    try {
      const r = await fetch('/api/linkedin/status');
      const d = await r.json();
      setVpsStatus(d.status === 'ok' ? 'online' : 'offline');
      setLinkedInStatus(d.linkedin || 'unknown');
    } catch {
      setVpsStatus('offline');
    }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/linkedin/campaigns');
      const d = await r.json();
      setCampaigns(d.campaigns || []);
    } catch { setCampaigns([]); }
    setLoading(false);
  }, []);

  useEffect(() => { checkVPS(); fetchCampaigns(); }, [checkVPS, fetchCampaigns]);

  const createCampaign = async () => {
    if (!newName.trim()) return;
    setError('');
    try {
      const r = await fetch('/api/linkedin/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, search_url: newSearchUrl, sequence: DEFAULT_SEQUENCE, daily_limit: 25 }),
      });
      const d = await r.json();
      if (d.campaign) {
        setCampaigns(prev => [d.campaign, ...prev]);
        setNewName(''); setNewSearchUrl(''); setShowCreate(false);
      } else {
        setError(d.error || 'Failed to create campaign');
      }
    } catch { setError('VPS connection failed'); }
  };

  const toggleCampaign = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    await fetch(`/api/linkedin/campaigns/${id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
  };

  const deleteCampaign = async (id: string) => {
    await fetch(`/api/linkedin/campaigns/${id}`, { method: 'DELETE' });
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Status bar */}
      <div className="flex items-center gap-4 rounded-xl bg-white/[0.03] border border-white/10 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${vpsStatus === 'online' ? 'bg-green-500' : vpsStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`} />
          <span className="text-xs text-gray-400">VPS: {vpsStatus}</span>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex items-center gap-2">
          <Linkedin size={14} className={linkedinStatus === 'connected' ? 'text-blue-400' : 'text-gray-600'} />
          <span className="text-xs text-gray-400">LinkedIn: {linkedinStatus}</span>
        </div>
        {vpsStatus === 'offline' && (
          <p className="text-xs text-yellow-500 ml-auto">VPS backend not running — deploy to Contabo first</p>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Linkedin size={20} className="text-blue-400" /> LinkedIn Growth
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Automated outreach campaigns — connect, message, and engage at scale</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
          <Plus size={14} /> New Campaign
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-2xl bg-blue-500/5 border border-blue-500/20 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Create Campaign</h3>
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Campaign name: e.g. Agency Owners Q2"
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500/50" />
          <input type="text" value={newSearchUrl} onChange={e => setNewSearchUrl(e.target.value)}
            placeholder="LinkedIn search URL (paste from LinkedIn People search)"
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500/50" />

          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Default Sequence</div>
            <div className="space-y-2">
              {DEFAULT_SEQUENCE.map((step, i) => {
                const info = ACTION_LABELS[step.action] || { label: step.action, color: 'text-gray-400' };
                return (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-gray-500 font-bold text-[10px]">{i + 1}</span>
                    <span className={`font-medium ${info.color}`}>{info.label}</span>
                    {step.delay_hours > 0 && <span className="text-gray-600">after {step.delay_hours}h</span>}
                    {step.template && <span className="text-gray-600 truncate max-w-xs">— "{step.template.slice(0, 50)}..."</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button onClick={createCampaign} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">Create Campaign</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Campaigns list */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-600" /></div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-8 text-center">
          <Linkedin size={32} className="text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No campaigns yet. Create one to start automating LinkedIn outreach.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => (
            <div key={c.id} className="rounded-xl bg-white/[0.03] border border-white/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${c.status === 'active' ? 'bg-green-500' : c.status === 'paused' ? 'bg-yellow-500' : 'bg-gray-600'}`} />
                  <span className="text-sm font-bold text-white">{c.name}</span>
                  <span className="text-[10px] bg-white/5 text-gray-500 px-2 py-0.5 rounded-full uppercase">{c.status}</span>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => toggleCampaign(c.id, c.status)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors">
                    {c.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button onClick={() => deleteCampaign(c.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'Total', value: c.stats?.total || 0, color: 'text-white' },
                  { label: 'Viewed', value: c.stats?.viewed || 0, color: 'text-blue-400' },
                  { label: 'Connected', value: c.stats?.connected || 0, color: 'text-green-400' },
                  { label: 'Messaged', value: c.stats?.messaged || 0, color: 'text-purple-400' },
                  { label: 'Replied', value: c.stats?.replied || 0, color: 'text-brand-orange' },
                ].map(s => (
                  <div key={s.label} className="rounded-lg bg-white/[0.02] border border-white/5 px-3 py-2 text-center">
                    <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-[10px] text-gray-600 uppercase">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Sequence preview */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                {c.sequence?.map((step, i) => {
                  const info = ACTION_LABELS[step.action];
                  return (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <span className="text-gray-700 text-xs">→</span>}
                      <span className={`text-xs ${info?.color || 'text-gray-500'}`}>{info?.label || step.action}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* How it works */}
      <div className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">How It Works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-400">
          <div><span className="text-blue-400 font-bold">1.</span> Create a campaign with a LinkedIn search URL and outreach sequence</div>
          <div><span className="text-blue-400 font-bold">2.</span> Import prospects from search — the VPS scrapes profiles automatically</div>
          <div><span className="text-blue-400 font-bold">3.</span> Automation runs 9am-6pm CT with human-like delays (45-120s between actions)</div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/5 text-xs text-gray-600">
          Daily limits: 40 connections, 80 messages, 150 profile views. Pauses automatically outside working hours.
        </div>
      </div>
    </div>
  );
}

'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Newspaper, LayoutGrid, Twitter, Linkedin, MessageSquare, Lightbulb, Video, Youtube, Image, Settings, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { useState } from 'react';

const NAV_ITEMS = [
  { label: 'Overview',         href: '/dashboard',                  icon: LayoutGrid },
  { label: 'News Feed',        href: '/dashboard/news',             icon: Newspaper },
  { label: 'Carousels',        href: '/dashboard/carousel',         icon: Image },
  { label: 'X Posts',           href: '/dashboard/x',                icon: Twitter },
  { label: 'Instagram Scripts', href: '/dashboard/instagram-scripts', icon: Video },
  { label: 'YouTube',          href: '/dashboard/youtube',           icon: Youtube },
  { label: 'Idea Engine',      href: '/dashboard/ideas',            icon: Lightbulb },
  { label: 'LinkedIn',         href: '/dashboard/linkedin',         icon: Linkedin },
  { label: 'Skool',            href: '/dashboard/skool',            icon: MessageSquare, disabled: true },
  { label: 'Settings',         href: '/dashboard/settings',         icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`flex-shrink-0 flex flex-col border-r border-white/5 bg-[#0A0A0A] transition-all duration-200 ${collapsed ? 'w-16' : 'w-56'}`}>
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-brand-orange flex items-center justify-center flex-shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        {!collapsed && <span className="text-sm font-bold text-white tracking-tight">SimpliScale</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          const Icon = item.icon;
          if (item.disabled) {
            return (
              <div key={item.href} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-600 cursor-not-allowed ${collapsed ? 'justify-center' : ''}`} title={`${item.label} (coming soon)`}>
                <Icon size={18} />
                {!collapsed && <span className="text-sm">{item.label}</span>}
                {!collapsed && <span className="ml-auto text-[10px] bg-white/5 text-gray-600 px-1.5 py-0.5 rounded-full">Soon</span>}
              </div>
            );
          }
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${collapsed ? 'justify-center' : ''} ${active ? 'bg-brand-orange/15 text-brand-orange' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <Icon size={18} />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center py-3 border-t border-white/5 text-gray-600 hover:text-white transition-colors">
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}

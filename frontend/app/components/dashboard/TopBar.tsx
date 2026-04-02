'use client';
import { usePathname } from 'next/navigation';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/news': 'AI News Feed',
  '/dashboard/carousel': 'Instagram Carousels',
  '/dashboard/x': 'X Post Generator',
  '/dashboard/instagram-scripts': 'Instagram Reel Scripts',
  '/dashboard/youtube': 'YouTube Studio',
  '/dashboard/ideas': 'Idea Engine',
  '/dashboard/linkedin': 'LinkedIn Growth',
  '/dashboard/skool': 'Skool Community',
  '/dashboard/settings': 'Settings',
};

export default function TopBar() {
  const pathname = usePathname() || '/dashboard';
  const title = ROUTE_TITLES[pathname] || 'Dashboard';

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-sm flex-shrink-0">
      <div>
        <h1 className="text-lg font-bold text-white">{title}</h1>
        <p className="text-xs text-gray-500">@thenickcornelius</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-green-500" title="Online" />
        <span className="text-xs text-gray-500">Nick Cornelius</span>
      </div>
    </header>
  );
}

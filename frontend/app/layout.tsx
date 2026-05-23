import type { Metadata } from 'next';
import {
  Plus_Jakarta_Sans,
  Inter,
  JetBrains_Mono,
  DM_Sans,
  Caveat,
  Playfair_Display,
  Archivo_Black,
} from 'next/font/google';
import './globals.css';

// Self-hosted via next/font/google so fonts are same-origin —
// html-to-image can read the @font-face rules and embed them in exported PNGs.
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
  preload: true,
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  preload: false,
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--font-dm-sans',
  display: 'swap',
  preload: false,
});

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-caveat',
  display: 'swap',
  preload: false,
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-playfair-display',
  display: 'swap',
  preload: false,
});

const archivoBlack = Archivo_Black({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-archivo-black',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL('https://simpliscale-carousel.vercel.app'),
  title: 'SimpliScale Command Center',
  description: 'Content growth dashboard — carousels, scripts, posts, LinkedIn, ideas.',
  twitter: { card: 'summary_large_image', creator: '@thenickcornelius' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars = [
    plusJakartaSans.variable,
    inter.variable,
    jetbrainsMono.variable,
    dmSans.variable,
    caveat.variable,
    playfairDisplay.variable,
    archivoBlack.variable,
  ].join(' ');

  return (
    <html lang="en" className={fontVars}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className="bg-[#1A1A1A] text-white antialiased"
        style={{ fontFamily: '"Plus Jakarta Sans", Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}
      >
        {children}
      </body>
    </html>
  );
}

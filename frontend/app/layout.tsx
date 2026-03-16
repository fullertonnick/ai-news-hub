import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], weight: ['400','600','700','800'], display: 'swap' });

export const metadata: Metadata = {
  title: 'AI News Hub | Nick Cornelius',
  description: 'Trending AI news and carousel generator for business owners.',
  twitter: { card: 'summary_large_image', creator: '@thenickcornelius' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.className} bg-black text-white antialiased`}>{children}</body>
    </html>
  );
}

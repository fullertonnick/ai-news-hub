// ─── Nick's photo collection (local, same-origin for CORS-safe export) ───────
// Stored in /public/nick-photos/ — safe for html-to-image toPng capture.

export const NICK_PHOTOS = [
  '/nick-photos/nick-1.jpg',
  '/nick-photos/nick-2.jpg',
  '/nick-photos/nick-3.jpg',
  '/nick-photos/nick-4.jpg',
  '/nick-photos/nick-5.jpg',
  '/nick-photos/nick-6.jpg',
  '/nick-photos/nick-7.jpg',
  '/nick-photos/nick-8.jpg',
  '/nick-photos/nick-9.jpg',
  '/nick-photos/nick-10.jpg',
  '/nick-photos/nick-11.jpg',
];

export function pickRandomPhoto(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return NICK_PHOTOS[Math.abs(hash) % NICK_PHOTOS.length];
}

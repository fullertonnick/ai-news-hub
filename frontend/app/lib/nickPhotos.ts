// ─── Nick's photo collection (Google Drive, public) ─────────────────────────
// These are served via lh3.googleusercontent.com direct-image URLs.

export const NICK_PHOTOS = [
  'https://lh3.googleusercontent.com/d/1Uu1y52sIqlKJOZEDfmkPVjDefIBhgZl7=s1080',  // airport
  'https://lh3.googleusercontent.com/d/1b3NPnykMZTF1XkjNkoDMrcHT5lAVmnPL=s1080',  // IMG_6691
  'https://lh3.googleusercontent.com/d/1ufmdFPvwaDxQrPPBlthqutRpirsLOq7f=s1080',  // IMG_6901
  'https://lh3.googleusercontent.com/d/1Y80S81MBk3t3q9ncHZwvX6VrtHBvcI7T=s1080',  // IMG_6904
  'https://lh3.googleusercontent.com/d/1erycPxO-jqLEOp-I_Li0QWM3fWDSZl6_=s1080',  // IMG_6905
  'https://lh3.googleusercontent.com/d/1jP0NaDaef3jARK5z5B5m8ImwaVgaZcmY=s1080',  // IMG_6908
  'https://lh3.googleusercontent.com/d/1XL7jD7VwJHX_JwH73K_JM7tQtS47Egfb=s1080',  // IMG_6986
  'https://lh3.googleusercontent.com/d/1WFmaRDOzBErZR7mp4e3soczPGElkzZSV=s1080',  // IMG_7163
];

export function pickRandomPhoto(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return NICK_PHOTOS[Math.abs(hash) % NICK_PHOTOS.length];
}

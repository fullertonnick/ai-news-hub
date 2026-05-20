/**
 * Convert any image URL to a base64 data URL for CORS-safe use with html-to-image.
 *
 * - Local same-origin paths (e.g. /nick-photos/nick-1.jpg): fetched directly in-browser.
 * - External URLs: proxied through /api/image-proxy to avoid CORS.
 * - Data URLs: returned as-is.
 */
export async function toDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;

  if (url.startsWith('/') && !url.startsWith('//')) {
    try {
      const r = await fetch(url);
      if (!r.ok) return url;
      const blob = await r.blob();
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(url);
        reader.readAsDataURL(blob);
      });
    } catch {
      return url;
    }
  }

  try {
    const r = await fetch('/api/image-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const d = await r.json();
    return d.dataUrl || url;
  } catch {
    return url;
  }
}

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

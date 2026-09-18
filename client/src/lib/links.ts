// Transaction links are stored in the `links` text column as a JSON array of
// { name, url }. Older records may hold plain newline/comma-separated URLs, so
// parse both shapes. Shared by the Transactions editor and the slide exports.

export interface TxLink {
  name: string;
  url: string;
}

export function parseLinks(s?: string): TxLink[] {
  const t = (s || '').trim();
  if (!t) return [];
  if (t.startsWith('[')) {
    try {
      const arr = JSON.parse(t);
      if (Array.isArray(arr)) {
        return arr
          .map((x) => ({ name: String(x?.name || ''), url: String(x?.url || '') }))
          .filter((x) => x.url);
      }
    } catch {
      /* fall through to legacy parsing */
    }
  }
  return t
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((url) => ({ name: '', url }));
}

export function serializeLinks(links: TxLink[]): string {
  const clean = links
    .map((l) => ({ name: l.name.trim(), url: l.url.trim() }))
    .filter((l) => l.url);
  return clean.length ? JSON.stringify(clean) : '';
}

// Ensure a link is an absolute URL so it opens correctly from a document.
export function linkHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

// Display text for a link: its label, else a cleaned-up URL.
export function linkLabel(l: TxLink): string {
  if (l.name && l.name.trim()) return l.name.trim();
  return l.url.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

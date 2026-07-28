import type { Property } from './types';

// Google Maps integration. The API key is stored in the browser (Settings), or
// baked in via VITE_GOOGLE_MAPS_KEY at build time. A referrer-restricted Maps
// key is safe to expose in a client app. Everything here is a no-op when no key
// is configured, so the app keeps working with the offline map + manual entry.

const KEY = 'cretmdx:gmaps_key';
const envKey = (import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined)?.trim() || '';

export function getMapsKey(): string {
  try {
    return localStorage.getItem(KEY)?.trim() || envKey;
  } catch {
    return envKey;
  }
}

export function setMapsKey(k: string): void {
  try {
    if (k.trim()) localStorage.setItem(KEY, k.trim());
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
  loaderPromise = null; // allow reloading with the new key
}

export function hasMapsKey(): boolean {
  return getMapsKey().length > 10;
}

// Lazily inject the Google Maps JS API (once) and resolve with `window.google`.
let loaderPromise: Promise<unknown> | null = null;
export function loadGoogleMaps(libraries = 'places,marker'): Promise<unknown> {
  const w = window as unknown as Record<string, unknown> & { google?: { maps?: unknown } };
  if (w.google?.maps) return Promise.resolve(w.google);
  if (loaderPromise) return loaderPromise;
  const key = getMapsKey();
  if (!key) return Promise.reject(new Error('No Google Maps API key set (add one in Settings).'));

  loaderPromise = new Promise((resolve, reject) => {
    const cb = '__cretmdxGmapsReady';
    (w as Record<string, unknown>)[cb] = () => resolve(w.google);
    const s = document.createElement('script');
    s.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}` +
      `&libraries=${libraries}&callback=${cb}&loading=async`;
    s.async = true;
    s.defer = true;
    s.onerror = () => {
      loaderPromise = null;
      reject(new Error('Could not load Google Maps — check the key and its API/referrer restrictions.'));
    };
    document.head.appendChild(s);
  });
  return loaderPromise;
}

// Static Map image URL (an <img> src) for a coordinate, or null with no key.
export function staticMapUrl(
  lat: number,
  lng: number,
  opts: { zoom?: number; w?: number; h?: number; maptype?: string } = {},
): string | null {
  const key = getMapsKey();
  if (!key) return null;
  const { zoom = 14, w = 440, h = 220, maptype = 'roadmap' } = opts;
  return (
    `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}` +
    `&zoom=${zoom}&size=${w}x${h}&scale=2&maptype=${maptype}` +
    `&markers=color:0x9D2235%7C${lat},${lng}&key=${encodeURIComponent(key)}`
  );
}

// Google returns country/state names that don't always match our option lists.
const COUNTRY_ALIASES: Record<string, string> = {
  'United States': 'USA',
  'United States of America': 'USA',
  US: 'USA',
  'The Netherlands': 'Netherlands',
  Czechia: 'Czech Republic',
};
export function normalizeCountry(name?: string): string {
  if (!name) return '';
  return COUNTRY_ALIASES[name] || name;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GPlace = any;

// Turn a Google Places result into the property fields we track.
export function placeToProperty(place: GPlace): Partial<Property> {
  const comps: GPlace[] = place?.address_components || [];
  const comp = (type: string) => comps.find((c: GPlace) => c.types?.includes(type));
  const streetNo = comp('street_number')?.long_name || '';
  const route = comp('route')?.long_name || '';
  const address =
    [streetNo, route].filter(Boolean).join(' ') || place?.name || place?.formatted_address || '';
  const city =
    comp('locality')?.long_name ||
    comp('postal_town')?.long_name ||
    comp('sublocality')?.long_name ||
    '';
  const state = comp('administrative_area_level_1')?.long_name || '';
  const zip = comp('postal_code')?.long_name || '';
  const country = normalizeCountry(comp('country')?.long_name || '');
  const loc = place?.geometry?.location;
  const out: Partial<Property> = { address, city, state, zip, country };
  if (loc) {
    out.lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
    out.lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
  }
  return out;
}

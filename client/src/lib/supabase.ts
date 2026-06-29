import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Supabase connection config. Two sources, in priority order:
//   1. Values pasted into Settings (stored in localStorage) — lets the live
//      static site connect with no rebuild.
//   2. Build-time env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) — baked
//      into the deployed bundle so every device is pre-pointed at the backend.
// The anon key is a public, RLS-protected key and is safe to ship in a client
// app; data access is gated by Row-Level Security + login, not by hiding the key.

const URL_KEY = 'cretmdx:supabase_url';
const ANON_KEY = 'cretmdx:supabase_key';

const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

function ls(key: string): string {
  try {
    return localStorage.getItem(key)?.trim() || '';
  } catch {
    return '';
  }
}

export function getSupabaseConfig(): { url: string; anonKey: string } {
  return {
    url: ls(URL_KEY) || envUrl,
    anonKey: ls(ANON_KEY) || envKey,
  };
}

export function setSupabaseConfig(url: string, anonKey: string): void {
  try {
    localStorage.setItem(URL_KEY, url.trim());
    localStorage.setItem(ANON_KEY, anonKey.trim());
  } catch {
    /* storage unavailable */
  }
  client = null; // force re-create on next access
}

export function clearSupabaseConfig(): void {
  try {
    localStorage.removeItem(URL_KEY);
    localStorage.removeItem(ANON_KEY);
  } catch {
    /* ignore */
  }
  client = null;
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig();
  return /^https?:\/\/.+/.test(url) && anonKey.length > 20;
}

let client: SupabaseClient | null = null;

// Returns a memoized client, or null when not configured (app falls back to the
// local browser store). Recreated whenever the config changes.
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;
  const { url, anonKey } = getSupabaseConfig();
  client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}

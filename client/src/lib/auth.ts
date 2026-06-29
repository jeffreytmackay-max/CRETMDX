import type { Session } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from './supabase';

// Thin auth wrapper over Supabase. When Supabase isn't configured the app runs
// in local-only mode and these are no-ops / "signed out".

export function backendEnabled(): boolean {
  return isSupabaseConfigured();
}

export async function getSession(): Promise<Session | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}

export function onAuthChange(cb: (session: Session | null) => void): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

export async function signIn(email: string, password: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Backend is not configured.');
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }> {
  const sb = getSupabase();
  if (!sb) throw new Error('Backend is not configured.');
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  // When email confirmations are on, there is no active session yet.
  return { needsConfirmation: !data.session };
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

export async function currentEmail(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.email ?? null;
}

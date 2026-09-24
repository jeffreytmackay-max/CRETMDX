// Supabase Edge Function: Anthropic proxy.
//
// Holds ANTHROPIC_API_KEY server-side so it never ships to the browser, and only
// serves signed-in users. The client (lib/ai.ts) points the Anthropic SDK's
// baseURL at `${SUPABASE_URL}/functions/v1/anthropic`; the SDK POSTs to
// `.../anthropic/v1/messages`, which this function forwards to Anthropic with the
// real key injected.
//
// Deploy with JWT verification OFF (we verify the user ourselves so CORS
// preflight works): see this folder's README.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const cors: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, anthropic-version, anthropic-beta, x-api-key, anthropic-dangerous-direct-browser-access',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Require a valid, signed-in Supabase user.
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Sign-in required.' }, 401);
  try {
    const supa = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );
    const { data, error } = await supa.auth.getUser(token);
    if (error || !data.user) return json({ error: 'Sign-in required.' }, 401);
  } catch {
    return json({ error: 'Could not verify sign-in.' }, 401);
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'Server is missing ANTHROPIC_API_KEY.' }, 500);

  // Forward the request body verbatim to Anthropic with the server-side key.
  const body = await req.text();
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': req.headers.get('anthropic-version') || '2023-06-01',
  };
  const beta = req.headers.get('anthropic-beta');
  if (beta) headers['anthropic-beta'] = beta;

  try {
    const upstream = await fetch(ANTHROPIC_URL, { method: 'POST', headers, body });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...cors, 'content-type': upstream.headers.get('content-type') || 'application/json' },
    });
  } catch (e) {
    return json({ error: 'Upstream request failed: ' + (e instanceof Error ? e.message : String(e)) }, 502);
  }
});

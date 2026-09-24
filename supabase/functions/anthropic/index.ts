// Supabase Edge Function: Anthropic proxy.
//
// Holds ANTHROPIC_API_KEY server-side so it never ships to the browser, and only
// serves signed-in users. The client (lib/ai.ts) points the Anthropic SDK's
// baseURL at `${SUPABASE_URL}/functions/v1/anthropic`; the SDK POSTs to
// `.../anthropic/v1/messages`, which this function forwards to Anthropic with the
// real key injected.
//
// Deploy with JWT verification OFF (we verify the user ourselves so the CORS
// preflight can reach this code): see this folder's README.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

// Reflect whatever headers the browser asks for (the Anthropic SDK adds several
// x-stainless-* headers), so the preflight always passes. A fixed allow-list
// would drop those and the browser would report "Connection error."
function corsHeaders(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers':
      req.headers.get('Access-Control-Request-Headers') ||
      'authorization, x-client-info, apikey, content-type, anthropic-version, anthropic-beta, x-api-key',
    'Access-Control-Max-Age': '86400',
  };
}

function json(req: Request, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'content-type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);

  // Require a valid, signed-in Supabase user (verified via the Auth REST API so
  // this function has no external dependencies to boot).
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return json(req, { error: 'Sign-in required.' }, 401);
  try {
    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const u = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anon },
    });
    if (!u.ok) return json(req, { error: 'Sign-in required.' }, 401);
  } catch {
    return json(req, { error: 'Could not verify sign-in.' }, 401);
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json(req, { error: 'Server is missing ANTHROPIC_API_KEY.' }, 500);

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
      headers: { ...corsHeaders(req), 'content-type': upstream.headers.get('content-type') || 'application/json' },
    });
  } catch (e) {
    return json(req, { error: 'Upstream request failed: ' + (e instanceof Error ? e.message : String(e)) }, 502);
  }
});

# Anthropic proxy (Supabase Edge Function)

Keeps the Anthropic API key **server-side** (never shipped to the browser) and
only serves **signed-in** users. The web app calls this instead of Anthropic
directly; `lib/ai.ts` points the Anthropic SDK's `baseURL` at
`${SUPABASE_URL}/functions/v1/anthropic`.

## One-time deploy

You need the [Supabase CLI](https://supabase.com/docs/guides/cli) and your
project ref (Dashboard → Project Settings → General → "Reference ID").

```bash
# 1. Log in and link the project (once)
supabase login
supabase link --project-ref <your-project-ref>

# 2. Store the Anthropic key as a server-side secret (NOT a build var)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxxxxx

# 3. Deploy the function (JWT verification off; it verifies the user itself)
supabase functions deploy anthropic --no-verify-jwt
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected automatically by the Edge
runtime — you do not set those.

## Notes

- `config.toml` already sets `verify_jwt = false` for this function, so if you
  deploy via `supabase functions deploy anthropic` (without the flag) it still
  applies. The flag is belt-and-suspenders.
- To rotate the key later: `supabase secrets set ANTHROPIC_API_KEY=...` (no
  redeploy of the app needed — the key lives only here).
- The function requires a valid signed-in Supabase user, so AI usage is limited
  to your team. Anonymous callers get 401.
- Prefer this over baking the key into the site: an Anthropic key in a public
  bundle can be extracted and used to spend your credits.

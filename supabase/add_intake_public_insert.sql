-- Public real estate request intake: allow anonymous (not-signed-in) visitors
-- to submit a request via the public form at #/submit. Anonymous users may ONLY
-- INSERT, and ONLY rows at the 'Intake' stage — they cannot read, update, or
-- delete any data. The Real Estate team (authenticated) keeps full access via
-- the existing "authenticated full access" policy.

grant insert on table public.transactions to anon;

drop policy if exists "intake public insert" on public.transactions;
create policy "intake public insert" on public.transactions
  for insert to anon
  with check (stage = 'Intake');

notify pgrst, 'reload schema';

-- One-time migration: link transactions to a lease (in addition to a property).
-- Run once in Supabase -> SQL Editor on an existing project. Safe to re-run.
alter table public.transactions
  add column if not exists lease_id bigint references public.leases(id) on delete set null;
notify pgrst, 'reload schema';

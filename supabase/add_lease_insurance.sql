-- One-time migration: per-lease insurance requirements + Certificate of
-- Insurance (COI) tracking. Stored as a JSON map so the field set can grow
-- without further migrations. Run once in Supabase → SQL Editor.
alter table public.leases add column if not exists insurance jsonb not null default '{}'::jsonb;
notify pgrst, 'reload schema';

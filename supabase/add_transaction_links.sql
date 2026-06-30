-- One-time migration: enable the "Links" field on transactions.
-- Run once in Supabase -> SQL Editor on an existing project. Safe to re-run.
alter table public.transactions add column if not exists links text;

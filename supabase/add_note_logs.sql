-- One-time migration: timestamped activity-log notes on properties and leases
-- (transactions already have note_log). Each entry is { id, ts, text, author }.
-- Run once in Supabase → SQL Editor.
alter table public.properties   add column if not exists note_log jsonb not null default '[]'::jsonb;
alter table public.leases        add column if not exists note_log jsonb not null default '[]'::jsonb;
alter table public.transactions  add column if not exists note_log jsonb not null default '[]'::jsonb;
notify pgrst, 'reload schema';

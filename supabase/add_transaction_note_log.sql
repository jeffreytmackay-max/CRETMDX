-- One-time migration: timestamped activity-log notes on transactions.
-- Each entry is { id, ts (ISO), text, author }. Run once in Supabase → SQL Editor.
alter table public.transactions add column if not exists note_log jsonb not null default '[]'::jsonb;
notify pgrst, 'reload schema';

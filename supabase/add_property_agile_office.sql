-- One-time migration: add the "Agile office" flag to properties (coworking /
-- flex space such as Regus or WeWork). Run once in Supabase -> SQL Editor.
alter table public.properties add column if not exists agile_office boolean default false;
notify pgrst, 'reload schema';

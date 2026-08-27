-- One-time migration: store the current lease expiration on the property so it
-- can be overwritten when a lease/extension is connected. Run once in Supabase.
alter table public.properties add column if not exists lease_expiration text;
notify pgrst, 'reload schema';

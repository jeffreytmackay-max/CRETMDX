-- CRETMDX — import the internal Real Estate Lease Tracker into Transactions.
-- Run ONCE in Supabase -> SQL Editor. Adds the tracker columns, then loads the
-- 14 transactions (skips any whose name already exists, so it is safe to re-run).

-- 1) Columns used by the tracker fields
alter table public.transactions add column if not exists links text;
alter table public.transactions add column if not exists space_type text;
alter table public.transactions add column if not exists progress text;
alter table public.transactions add column if not exists date_needed_by text;
alter table public.transactions add column if not exists priority text;
alter table public.transactions add column if not exists assigned_to text;
alter table public.transactions add column if not exists coi_status text;
alter table public.transactions add column if not exists deposit_status text;
notify pgrst, 'reload schema';

-- 2) Data
insert into public.transactions (name, property_id, type, stage, space_type, progress, date_needed_by, priority, assigned_to, coi_status, deposit_status, notes, probability, estimated_value, target_sqft)
  select 'Dallas Hub Relocation', (select id from public.properties where name = 'Dallas Hub' limit 1), 'Relocation', 'Negotiating Legal Terms', 'NOP', 'Planning', '2026-06-01', 'Low', 'Jeffrey MacKay', null, null, 'Renew for another year. — Jeffrey MacKay, 03/23/26 2:35 PM
If they have an additional 1000 SQFT. — Jeffrey MacKay, 03/23/26 2:35 PM
Not currently located at the aviation site.  Need to account for space.  2453. — Jeffrey MacKay, 03/23/26 2:34 PM', 50, 0, 0
  where not exists (select 1 from public.transactions where name = 'Dallas Hub Relocation');

insert into public.transactions (name, property_id, type, stage, space_type, progress, date_needed_by, priority, assigned_to, coi_status, deposit_status, notes, probability, estimated_value, target_sqft)
  select 'Phoenix Renewal', (select id from public.properties where name = 'Phoenix Hub' limit 1), 'Renewal', 'Completed', 'NOP', 'Complete', '2026-04-30', 'Medium', 'Jeffrey MacKay', 'Received', 'Deposit Sent to LL', null, 50, 0, 0
  where not exists (select 1 from public.transactions where name = 'Phoenix Renewal');

insert into public.transactions (name, property_id, type, stage, space_type, progress, date_needed_by, priority, assigned_to, coi_status, deposit_status, notes, probability, estimated_value, target_sqft)
  select 'Durham Location', (select id from public.properties where name = 'Durham Hub' limit 1), 'New Lease', 'Completed', 'NOP', 'Complete', '2026-04-30', 'High', 'Jeffrey MacKay', 'Not Started', 'Request Invoice and W9', 'Lease is currently being reviewed by external counsel — Jeffrey MacKay, 04/17/26 11:17 AM', 50, 0, 0
  where not exists (select 1 from public.transactions where name = 'Durham Location');

insert into public.transactions (name, property_id, type, stage, space_type, progress, date_needed_by, priority, assigned_to, coi_status, deposit_status, notes, probability, estimated_value, target_sqft)
  select 'Teterborro', (select id from public.properties where name = 'Teterboro Hub' limit 1), 'New Lease', 'Completed', 'NOP', 'In Progress', null, 'High', 'Jeffrey MacKay', 'Sent to Landlord', 'Deposit Sent to LL', 'COI Complete.  Awaiting Security Deposit — Jeffrey MacKay, 03/17/26 10:56 AM
Lease is signed, City Paperwork is complete.  Awaiting COI — Jeffrey MacKay, 03/10/26 10:53 AM', 50, 0, 0
  where not exists (select 1 from public.transactions where name = 'Teterborro');

insert into public.transactions (name, property_id, type, stage, space_type, progress, date_needed_by, priority, assigned_to, coi_status, deposit_status, notes, probability, estimated_value, target_sqft)
  select 'Los Angeles', (select id from public.properties where name = 'Los Angeles Hub' limit 1), 'Relocation', 'Site Search', 'NOP', 'In Progress', '2026-03-31', 'High', 'Jeffrey MacKay', 'Not Started', 'Request Invoice and W9', 'Extended Regus space on a month to month basis.  Targeting a new space near Van Nuys Airport — Jeffrey MacKay, 05/13/26 12:34 PM', 50, 0, 0
  where not exists (select 1 from public.transactions where name = 'Los Angeles');

insert into public.transactions (name, property_id, type, stage, space_type, progress, date_needed_by, priority, assigned_to, coi_status, deposit_status, notes, probability, estimated_value, target_sqft)
  select 'Kansas Expansion', (select id from public.properties where name = 'Kansas Hub' limit 1), 'Expansion', 'Completed', 'NOP', 'Complete', '2026-04-30', 'Medium', 'Jeffrey MacKay', null, null, null, 50, 0, 0
  where not exists (select 1 from public.transactions where name = 'Kansas Expansion');

insert into public.transactions (name, property_id, type, stage, space_type, progress, date_needed_by, priority, assigned_to, coi_status, deposit_status, notes, probability, estimated_value, target_sqft)
  select 'Tampa', (select id from public.properties where name = 'Tampa Hub' limit 1), 'Renewal', 'Completed', 'NOP', 'Complete', '2026-06-30', 'Medium', 'Jeffrey MacKay', null, null, 'Pursing 1 Year Extension — Jeffrey MacKay, 05/13/26 12:27 PM
We have contact the broker to ask for 1 year renewal — Jeffrey MacKay, 04/17/26 11:16 AM', 50, 0, 0
  where not exists (select 1 from public.transactions where name = 'Tampa');

insert into public.transactions (name, property_id, type, stage, space_type, progress, date_needed_by, priority, assigned_to, coi_status, deposit_status, notes, probability, estimated_value, target_sqft)
  select 'St. Paul', (select id from public.properties where name = 'St. Paul Hub' limit 1), 'Disposition', 'Completed', 'NOP', 'Complete', '2026-05-31', 'High', 'Jeffrey MacKay', null, null, 'Turn of leased returned today. — Jeffrey MacKay, 05/13/26 2:19 PM', 50, 0, 0
  where not exists (select 1 from public.transactions where name = 'St. Paul');

insert into public.transactions (name, property_id, type, stage, space_type, progress, date_needed_by, priority, assigned_to, coi_status, deposit_status, notes, probability, estimated_value, target_sqft)
  select 'Las Vegas', null, 'New Lease', 'Site Search', 'NOP', 'Planning', null, 'Medium', 'Jeffrey MacKay', 'Not Started', null, 'Further Requirments to be defined — Jeffrey MacKay, 05/13/26 1:11 PM
"Micro-Hub for 6-8 Months". — Jeffrey MacKay, 05/13/26 1:11 PM', 50, 0, 0
  where not exists (select 1 from public.transactions where name = 'Las Vegas');

insert into public.transactions (name, property_id, type, stage, space_type, progress, date_needed_by, priority, assigned_to, coi_status, deposit_status, notes, probability, estimated_value, target_sqft)
  select 'Baltimore', null, 'New Lease', 'Site Search', 'NOP', 'Planning', '2026-06-30', 'Medium', 'Jeffrey MacKay', null, null, null, 50, 0, 0
  where not exists (select 1 from public.transactions where name = 'Baltimore');

insert into public.transactions (name, property_id, type, stage, space_type, progress, date_needed_by, priority, assigned_to, coi_status, deposit_status, notes, probability, estimated_value, target_sqft)
  select 'Utrecht', (select id from public.properties where name = 'Utrecht Hub' limit 1), 'New Lease', 'Completed', 'NOP', 'In Progress', '2026-06-12', 'High', 'Jeffrey MacKay', null, null, null, 50, 0, 0
  where not exists (select 1 from public.transactions where name = 'Utrecht');

insert into public.transactions (name, property_id, type, stage, space_type, progress, date_needed_by, priority, assigned_to, coi_status, deposit_status, notes, probability, estimated_value, target_sqft)
  select 'Bari', null, 'New Lease', 'To Be Assigned', null, null, null, null, null, null, null, null, 50, 0, 0
  where not exists (select 1 from public.transactions where name = 'Bari');

insert into public.transactions (name, property_id, type, stage, space_type, progress, date_needed_by, priority, assigned_to, coi_status, deposit_status, notes, probability, estimated_value, target_sqft)
  select 'Bologna', null, 'New Lease', 'Negotiating Legal Terms', 'NOP', 'In Progress', '2026-06-12', 'High', 'Jeffrey MacKay', null, null, null, 50, 0, 0
  where not exists (select 1 from public.transactions where name = 'Bologna');

insert into public.transactions (name, property_id, type, stage, space_type, progress, date_needed_by, priority, assigned_to, coi_status, deposit_status, notes, probability, estimated_value, target_sqft)
  select 'San Ramon', (select id from public.properties where name = 'San Ramon Hub' limit 1), 'New Lease', 'To Be Assigned', null, null, null, null, null, null, null, null, 50, 0, 0
  where not exists (select 1 from public.transactions where name = 'San Ramon');

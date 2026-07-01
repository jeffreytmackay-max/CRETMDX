-- CRETMDX — Supabase schema + security setup.
-- Run this ONCE in your Supabase project: Dashboard → SQL Editor → New query →
-- paste this whole file → Run. It is safe to re-run (idempotent).
--
-- Dates are stored as text to match the app's free-form date handling. Access is
-- locked down with Row-Level Security so ONLY signed-in users can read or write;
-- all signed-in users share one portfolio (a single-tenant company workspace).

-- ---------- Tables ----------
create table if not exists public.properties (
  id            bigint generated always as identity primary key,
  name          text not null,
  address       text,
  city          text,
  state         text,
  zip           text,
  country       text default 'USA',
  lat           double precision,
  lng           double precision,
  property_type text default 'NOP Hub',
  rentable_sqft integer default 0,
  status        text default 'Active',
  ownership     text default 'Leased',
  agile_office  boolean default false,
  notes         text,
  created_at    timestamptz default now()
);
alter table public.properties add column if not exists agile_office boolean default false;

create table if not exists public.leases (
  id                   bigint generated always as identity primary key,
  property_id          bigint references public.properties(id) on delete cascade,
  lease_name           text not null,
  counterparty         text,
  lease_type           text default 'Direct',
  role                 text default 'Tenant',
  commencement_date    text,
  expiration_date      text,
  rentable_sqft        integer default 0,
  base_rent_annual     numeric default 0,
  escalation_pct       numeric default 0,
  opex_psf             numeric default 0,
  free_rent_months     integer default 0,
  ti_allowance_psf     numeric default 0,
  security_deposit     numeric default 0,
  renewal_options      text,
  notice_period_months integer default 6,
  status               text default 'Active',
  execution_date       text,
  rent_start_date      text,
  duration_months      integer default 0,
  usable_sqft          integer default 0,
  loss_factor          numeric default 0,
  building_type        text,
  property_use         text,
  lead_broker          text,
  rent_calc_type       text,
  currency             text default 'USD',
  parking_spaces       integer default 0,
  parking_rate_monthly numeric default 0,
  notes                text,
  created_at           timestamptz default now()
);

create table if not exists public.transactions (
  id                bigint generated always as identity primary key,
  name              text not null,
  property_id       bigint references public.properties(id) on delete set null,
  lease_id          bigint references public.leases(id) on delete set null,
  type              text default 'New Lease',
  stage             text default 'Prospecting',
  market            text,
  target_sqft       integer default 0,
  estimated_value   numeric default 0,
  probability       integer default 50,
  broker            text,
  lead              text,
  start_date        text,
  target_close_date text,
  notes             text,
  links             text,
  space_type        text,
  progress          text,
  date_needed_by    text,
  priority          text,
  assigned_to       text,
  coi_status        text,
  deposit_status    text,
  created_at        timestamptz default now()
);
-- For projects created before these columns existed:
alter table public.transactions add column if not exists links text;
alter table public.transactions add column if not exists space_type text;
alter table public.transactions add column if not exists progress text;
alter table public.transactions add column if not exists date_needed_by text;
alter table public.transactions add column if not exists priority text;
alter table public.transactions add column if not exists assigned_to text;
alter table public.transactions add column if not exists coi_status text;
alter table public.transactions add column if not exists deposit_status text;
alter table public.transactions add column if not exists lease_id bigint references public.leases(id) on delete set null;

create index if not exists leases_property_id_idx on public.leases(property_id);
create index if not exists transactions_property_id_idx on public.transactions(property_id);

-- ---------- Row-Level Security ----------
alter table public.properties   enable row level security;
alter table public.leases       enable row level security;
alter table public.transactions enable row level security;

-- Any signed-in (authenticated) user has full access; anonymous users have none.
do $$
declare t text;
begin
  foreach t in array array['properties','leases','transactions'] loop
    execute format('drop policy if exists "authenticated full access" on public.%I', t);
    execute format(
      'create policy "authenticated full access" on public.%I
         for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

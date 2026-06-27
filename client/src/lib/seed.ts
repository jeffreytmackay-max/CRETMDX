import type { Property, Lease, Transaction } from './types';

// The same sample portfolio the backend seeds, embedded for the browser-only build.
// Property ids 1-12; lease/transaction property_id references use those ids.

export const SEED_PROPERTIES: Property[] = [
  { id: 1, name: 'One Market HQ', address: '1 Market St', city: 'San Francisco', state: 'CA', zip: '94105', country: 'USA', lat: 37.7936, lng: -122.3949, property_type: 'Office', rentable_sqft: 145000, status: 'Active', market: 'SF Bay Area' },
  { id: 2, name: 'Hudson Yards Tower', address: '30 Hudson Yards', city: 'New York', state: 'NY', zip: '10001', country: 'USA', lat: 40.7539, lng: -74.0011, property_type: 'Office', rentable_sqft: 220000, status: 'Active', market: 'NYC Metro' },
  { id: 3, name: 'Domain Tech Center', address: '11801 Domain Blvd', city: 'Austin', state: 'TX', zip: '78758', country: 'USA', lat: 30.4012, lng: -97.7251, property_type: 'Office', rentable_sqft: 98000, status: 'Active', market: 'Austin' },
  { id: 4, name: 'River North Loft', address: '600 W Chicago Ave', city: 'Chicago', state: 'IL', zip: '60654', country: 'USA', lat: 41.8967, lng: -87.6444, property_type: 'Office', rentable_sqft: 62000, status: 'Active', market: 'Chicago' },
  { id: 5, name: 'Seaport Innovation', address: '121 Seaport Blvd', city: 'Boston', state: 'MA', zip: '02210', country: 'USA', lat: 42.3519, lng: -71.0469, property_type: 'Office', rentable_sqft: 84000, status: 'Active', market: 'Boston' },
  { id: 6, name: 'Buckhead Plaza', address: '3344 Peachtree Rd NE', city: 'Atlanta', state: 'GA', zip: '30326', country: 'USA', lat: 33.8487, lng: -84.3665, property_type: 'Office', rentable_sqft: 71000, status: 'Active', market: 'Atlanta' },
  { id: 7, name: 'Denver Tech Campus', address: '8000 E Belleview Ave', city: 'Denver', state: 'CO', zip: '80111', country: 'USA', lat: 39.6167, lng: -104.8967, property_type: 'Office', rentable_sqft: 55000, status: 'Under Review', market: 'Denver' },
  { id: 8, name: 'Inland Empire DC', address: '12700 Slover Ave', city: 'Fontana', state: 'CA', zip: '92337', country: 'USA', lat: 34.0581, lng: -117.4555, property_type: 'Industrial', rentable_sqft: 410000, status: 'Active', market: 'SoCal' },
  { id: 9, name: 'Dallas Logistics Hub', address: '4800 S Pinemont Dr', city: 'Dallas', state: 'TX', zip: '75247', country: 'USA', lat: 32.8023, lng: -96.8951, property_type: 'Warehouse', rentable_sqft: 325000, status: 'Active', market: 'Dallas-Fort Worth' },
  { id: 10, name: 'Magnificent Mile Retail', address: '663 N Michigan Ave', city: 'Chicago', state: 'IL', zip: '60611', country: 'USA', lat: 41.8939, lng: -87.6244, property_type: 'Retail', rentable_sqft: 18000, status: 'Active', market: 'Chicago' },
  { id: 11, name: 'Miami Brickell Center', address: '701 Brickell Ave', city: 'Miami', state: 'FL', zip: '33131', country: 'USA', lat: 25.7634, lng: -80.1911, property_type: 'Office', rentable_sqft: 76000, status: 'Active', market: 'South Florida' },
  { id: 12, name: 'Seattle South Lake Union', address: '400 Fairview Ave N', city: 'Seattle', state: 'WA', zip: '98109', country: 'USA', lat: 47.6256, lng: -122.3344, property_type: 'Office', rentable_sqft: 132000, status: 'Active', market: 'Seattle' },
  { id: 13, name: 'TransMedics — Somerville', address: '188 Assembly Park Drive', city: 'Somerville', state: 'MA', zip: '02145', country: 'USA', lat: 42.3925, lng: -71.0779, property_type: 'Office', rentable_sqft: 498286, status: 'Active', market: 'Boston' },
];

const L = (o: Partial<Lease>): Lease =>
  ({
    role: 'Tenant', lease_type: 'Direct', status: 'Active', country: 'USA',
    free_rent_months: 0, ti_allowance_psf: 0, opex_psf: 0, escalation_pct: 3,
    notice_period_months: 9, security_deposit: 0, renewal_options: 'None',
    ...o,
  }) as Lease;

export const SEED_LEASES: Lease[] = [
  L({ id: 1, property_id: 1, lease_name: 'One Market HQ — Floors 20-24', counterparty: 'Boston Properties', commencement_date: '2019-03-01', expiration_date: '2026-09-30', rentable_sqft: 145000, base_rent_annual: 10875000, escalation_pct: 3, opex_psf: 22, free_rent_months: 6, ti_allowance_psf: 85, security_deposit: 1800000, renewal_options: 'One 5-year option at FMV', notice_period_months: 12 }),
  L({ id: 2, property_id: 2, lease_name: 'Hudson Yards — Floors 41-48', counterparty: 'Related Companies', commencement_date: '2021-06-01', expiration_date: '2031-05-31', rentable_sqft: 220000, base_rent_annual: 20900000, escalation_pct: 2.75, opex_psf: 28, free_rent_months: 12, ti_allowance_psf: 120, security_deposit: 3500000, renewal_options: 'Two 5-year options', notice_period_months: 12 }),
  L({ id: 3, property_id: 3, lease_name: 'Domain Tech Center — Bldg C', counterparty: 'TIER REIT', commencement_date: '2022-01-15', expiration_date: '2027-01-14', rentable_sqft: 98000, base_rent_annual: 4116000, escalation_pct: 3, opex_psf: 14, free_rent_months: 4, ti_allowance_psf: 60, security_deposit: 685000, renewal_options: 'One 3-year option' }),
  L({ id: 4, property_id: 4, lease_name: 'River North Loft — Suite 500', counterparty: 'Sterling Bay', lease_type: 'Sublease', commencement_date: '2020-09-01', expiration_date: '2026-08-31', rentable_sqft: 62000, base_rent_annual: 2480000, escalation_pct: 2.5, opex_psf: 16, free_rent_months: 3, ti_allowance_psf: 35, security_deposit: 410000, notice_period_months: 6 }),
  L({ id: 5, property_id: 5, lease_name: 'Seaport Innovation — Floors 6-7', counterparty: 'WS Development', commencement_date: '2023-04-01', expiration_date: '2030-03-31', rentable_sqft: 84000, base_rent_annual: 5460000, escalation_pct: 3, opex_psf: 24, free_rent_months: 6, ti_allowance_psf: 90, security_deposit: 910000, renewal_options: 'One 5-year option', notice_period_months: 12 }),
  L({ id: 6, property_id: 6, lease_name: 'Buckhead Plaza — Suite 1200', counterparty: 'Cousins Properties', commencement_date: '2021-11-01', expiration_date: '2026-10-31', rentable_sqft: 71000, base_rent_annual: 2485000, escalation_pct: 2.75, opex_psf: 13, free_rent_months: 5, ti_allowance_psf: 50, security_deposit: 415000, renewal_options: 'One 5-year option' }),
  L({ id: 7, property_id: 8, lease_name: 'Inland Empire DC — Whole Building', counterparty: 'Prologis', commencement_date: '2020-02-01', expiration_date: '2032-01-31', rentable_sqft: 410000, base_rent_annual: 5535000, escalation_pct: 3.5, opex_psf: 2.5, free_rent_months: 2, ti_allowance_psf: 8, security_deposit: 920000, renewal_options: 'Two 5-year options', notice_period_months: 12 }),
  L({ id: 8, property_id: 9, lease_name: 'Dallas Logistics Hub — Bays 1-8', counterparty: 'Duke Realty', commencement_date: '2022-07-01', expiration_date: '2029-06-30', rentable_sqft: 325000, base_rent_annual: 3412500, escalation_pct: 3, opex_psf: 1.8, free_rent_months: 3, ti_allowance_psf: 5, security_deposit: 570000, renewal_options: 'One 5-year option', notice_period_months: 12 }),
  L({ id: 9, property_id: 10, lease_name: 'Magnificent Mile Retail — Flagship', counterparty: 'Acadia Realty', commencement_date: '2018-05-01', expiration_date: '2026-12-31', rentable_sqft: 18000, base_rent_annual: 3600000, escalation_pct: 4, opex_psf: 35, free_rent_months: 0, ti_allowance_psf: 150, security_deposit: 600000, renewal_options: 'One 5-year option at 110% FMV', notice_period_months: 12 }),
  L({ id: 10, property_id: 11, lease_name: 'Miami Brickell Center — Floor 18', counterparty: 'Rilea Group', commencement_date: '2023-09-01', expiration_date: '2028-08-31', rentable_sqft: 76000, base_rent_annual: 4180000, escalation_pct: 3.25, opex_psf: 20, free_rent_months: 4, ti_allowance_psf: 70, security_deposit: 700000, renewal_options: 'One 5-year option' }),
  L({ id: 11, property_id: 12, lease_name: 'Seattle SLU — Floors 3-8', counterparty: 'Vulcan Real Estate', commencement_date: '2020-10-01', expiration_date: '2027-09-30', rentable_sqft: 132000, base_rent_annual: 7260000, escalation_pct: 3, opex_psf: 21, free_rent_months: 8, ti_allowance_psf: 95, security_deposit: 1210000, renewal_options: 'One 5-year option', notice_period_months: 12 }),
  L({
    id: 12,
    property_id: 13,
    lease_name: 'TransMedics — 188 Assembly Park Dr',
    counterparty: 'BRE-BMR 26 Assembly Innovation I LLC',
    lease_type: 'Direct',
    commencement_date: '2026-01-05',
    expiration_date: '2044-01-31',
    rentable_sqft: 498286,
    base_rent_annual: 1993144,
    escalation_pct: 3,
    opex_psf: 0,
    free_rent_months: 24,
    ti_allowance_psf: 0,
    security_deposit: 17938296,
    renewal_options: 'Two 10-year options at 95% FMV (18-mo notice); plus a one-time 6-month short-term option at 100% of then-current rent',
    notice_period_months: 18,
    execution_date: '2026-01-05',
    rent_start_date: '2028-01-01',
    duration_months: 216,
    building_type: 'Office/Lab',
    property_use: 'Office and laboratory',
    lead_broker: 'John Wilson',
    rent_calc_type: 'Net',
    currency: 'USD',
    parking_spaces: 558,
    parking_rate_monthly: 250,
    notes:
      'Source: CBRE Lease Abstract (TransMedics-MA-Somerville, 2/13/2026).\n\n' +
      'Options & critical events: Fixed purchase option ($362,389,818, exercisable until ~60 days before the 3rd anniversary of the TCD) plus parking purchase ($12,200,000); Right of First Offer to purchase after year 3; two 10-year renewal options at 95% FMV; 6-month short-term extension option; multiple TI design/budget/schedule deadlines and TI Letter-of-Credit step-ups.\n\n' +
      'Clauses: Triple-net — tenant pays its Adjusted Share of Operating Expenses plus a Property Management Fee (monthly OpEx TBD). Security: $17,938,296 letter of credit, reducible after year 4 if market cap > $3B and unrestricted cash > $200M. TI allowance: lease is silent. Parking: 558 Phase-I spaces at $250/space/mo (≤3% annual increases), payable from the Rent Commencement Date regardless of use.\n\n' +
      'Abstractor notes: All dates estimated from an assumed Term Commencement Date of 1/5/2026 and need confirmation; base rent first payable on the Rent Commencement Date (later of 1/1/2028 or 24 months after TCD).',
  }),
];

export const SEED_TRANSACTIONS: Transaction[] = [
  { id: 1, name: 'SF HQ Renewal & Restack', property_id: 1, type: 'Renewal', stage: 'Negotiation', market: 'SF Bay Area', target_sqft: 145000, estimated_value: 58000000, probability: 70, broker: 'CBRE', lead: 'A. Nguyen', start_date: '2025-09-01', target_close_date: '2026-03-31', notes: 'Targeting blend-and-extend; restack to consolidate 5 floors.' },
  { id: 2, name: 'Chicago Loft Disposition', property_id: 4, type: 'Disposition', stage: 'LOI', market: 'Chicago', target_sqft: 62000, estimated_value: 2100000, probability: 55, broker: 'JLL', lead: 'M. Torres', start_date: '2026-01-10', target_close_date: '2026-08-15', notes: 'Sublease expires 8/2026; marketing for early sublet of remaining term.' },
  { id: 3, name: 'Phoenix Build-to-Suit', property_id: null, type: 'New Lease', stage: 'Prospecting', market: 'Phoenix', target_sqft: 90000, estimated_value: 31000000, probability: 30, broker: 'Cushman & Wakefield', lead: 'R. Patel', start_date: '2026-02-01', target_close_date: '2027-01-31', notes: 'Evaluating BTS vs existing inventory near Sky Harbor.' },
  { id: 4, name: 'Atlanta Buckhead Expansion', property_id: 6, type: 'Expansion', stage: 'LOI', market: 'Atlanta', target_sqft: 25000, estimated_value: 8800000, probability: 60, broker: 'CBRE', lead: 'A. Nguyen', start_date: '2026-01-20', target_close_date: '2026-07-31', notes: 'Expand to full floor adjacent to existing suite.' },
  { id: 5, name: 'Denver Tech New Lease', property_id: 7, type: 'New Lease', stage: 'Legal', market: 'Denver', target_sqft: 55000, estimated_value: 19500000, probability: 85, broker: 'Newmark', lead: 'K. Olsen', start_date: '2025-11-01', target_close_date: '2026-07-01', notes: 'Lease out for signature; awaiting landlord redlines.' },
  { id: 6, name: 'Austin Domain Renewal', property_id: 3, type: 'Renewal', stage: 'Prospecting', market: 'Austin', target_sqft: 98000, estimated_value: 22000000, probability: 40, broker: 'JLL', lead: 'M. Torres', start_date: '2026-03-01', target_close_date: '2026-11-30', notes: 'Expiration 1/2027 — begin renewal strategy and market survey.' },
  { id: 7, name: 'Nashville Market Entry', property_id: null, type: 'Acquisition', stage: 'Prospecting', market: 'Nashville', target_sqft: 60000, estimated_value: 27000000, probability: 25, broker: 'Colliers', lead: 'R. Patel', start_date: '2026-04-01', target_close_date: '2027-03-31', notes: 'Strategic new market; lease vs buy analysis underway.' },
  { id: 8, name: 'Dallas DC Lease Executed', property_id: 9, type: 'New Lease', stage: 'Executed', market: 'Dallas-Fort Worth', target_sqft: 325000, estimated_value: 24000000, probability: 100, broker: 'Stream Realty', lead: 'K. Olsen', start_date: '2022-04-01', target_close_date: '2022-07-01', notes: 'Closed; included for pipeline history.' },
];

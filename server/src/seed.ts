import { db, initSchema } from './db.js';

initSchema();

console.log('Clearing existing data...');
db.exec('DELETE FROM scenarios; DELETE FROM transactions; DELETE FROM leases; DELETE FROM properties;');
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('properties','leases','transactions','scenarios');");

interface PropSeed {
  name: string; address: string; city: string; state: string; zip: string;
  lat: number; lng: number; property_type: string; rentable_sqft: number;
  status: string; market: string;
}

const properties: PropSeed[] = [
  { name: 'One Market HQ', address: '1 Market St', city: 'San Francisco', state: 'CA', zip: '94105', lat: 37.7936, lng: -122.3949, property_type: 'Office', rentable_sqft: 145000, status: 'Active', market: 'SF Bay Area' },
  { name: 'Hudson Yards Tower', address: '30 Hudson Yards', city: 'New York', state: 'NY', zip: '10001', lat: 40.7539, lng: -74.0011, property_type: 'Office', rentable_sqft: 220000, status: 'Active', market: 'NYC Metro' },
  { name: 'Domain Tech Center', address: '11801 Domain Blvd', city: 'Austin', state: 'TX', zip: '78758', lat: 30.4012, lng: -97.7251, property_type: 'Office', rentable_sqft: 98000, status: 'Active', market: 'Austin' },
  { name: 'River North Loft', address: '600 W Chicago Ave', city: 'Chicago', state: 'IL', zip: '60654', lat: 41.8967, lng: -87.6444, property_type: 'Office', rentable_sqft: 62000, status: 'Active', market: 'Chicago' },
  { name: 'Seaport Innovation', address: '121 Seaport Blvd', city: 'Boston', state: 'MA', zip: '02210', lat: 42.3519, lng: -71.0469, property_type: 'Office', rentable_sqft: 84000, status: 'Active', market: 'Boston' },
  { name: 'Buckhead Plaza', address: '3344 Peachtree Rd NE', city: 'Atlanta', state: 'GA', zip: '30326', lat: 33.8487, lng: -84.3665, property_type: 'Office', rentable_sqft: 71000, status: 'Active', market: 'Atlanta' },
  { name: 'Denver Tech Campus', address: '8000 E Belleview Ave', city: 'Denver', state: 'CO', zip: '80111', lat: 39.6167, lng: -104.8967, property_type: 'Office', rentable_sqft: 55000, status: 'Under Review', market: 'Denver' },
  { name: 'Inland Empire DC', address: '12700 Slover Ave', city: 'Fontana', state: 'CA', zip: '92337', lat: 34.0581, lng: -117.4555, property_type: 'Industrial', rentable_sqft: 410000, status: 'Active', market: 'SoCal' },
  { name: 'Dallas Logistics Hub', address: '4800 S Pinemont Dr', city: 'Dallas', state: 'TX', zip: '75247', lat: 32.8023, lng: -96.8951, property_type: 'Warehouse', rentable_sqft: 325000, status: 'Active', market: 'Dallas-Fort Worth' },
  { name: 'Magnificent Mile Retail', address: '663 N Michigan Ave', city: 'Chicago', state: 'IL', zip: '60611', lat: 41.8939, lng: -87.6244, property_type: 'Retail', rentable_sqft: 18000, status: 'Active', market: 'Chicago' },
  { name: 'Miami Brickell Center', address: '701 Brickell Ave', city: 'Miami', state: 'FL', zip: '33131', lat: 25.7634, lng: -80.1911, property_type: 'Office', rentable_sqft: 76000, status: 'Active', market: 'South Florida' },
  { name: 'Seattle South Lake Union', address: '400 Fairview Ave N', city: 'Seattle', state: 'WA', zip: '98109', lat: 47.6256, lng: -122.3344, property_type: 'Office', rentable_sqft: 132000, status: 'Active', market: 'Seattle' },
];

console.log(`Inserting ${properties.length} properties...`);
const insertProp = db.prepare(
  `INSERT INTO properties (name, address, city, state, zip, lat, lng, property_type, rentable_sqft, status, market)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
const propIds: number[] = [];
for (const p of properties) {
  const info = insertProp.run(p.name, p.address, p.city, p.state, p.zip, p.lat, p.lng, p.property_type, p.rentable_sqft, p.status, p.market);
  propIds.push(Number(info.lastInsertRowid));
}

// Leases: one or two per office/industrial property. Mix of expirations to populate critical dates.
interface LeaseSeed {
  pi: number; lease_name: string; counterparty: string; lease_type: string; role: string;
  commencement_date: string; expiration_date: string; rentable_sqft: number;
  base_rent_annual: number; escalation_pct: number; opex_psf: number;
  free_rent_months: number; ti_allowance_psf: number; security_deposit: number;
  renewal_options: string; notice_period_months: number; status: string;
}

const leases: LeaseSeed[] = [
  { pi: 0, lease_name: 'One Market HQ — Floors 20-24', counterparty: 'Boston Properties', lease_type: 'Direct', role: 'Tenant', commencement_date: '2019-03-01', expiration_date: '2026-09-30', rentable_sqft: 145000, base_rent_annual: 10875000, escalation_pct: 3, opex_psf: 22, free_rent_months: 6, ti_allowance_psf: 85, security_deposit: 1800000, renewal_options: 'One 5-year option at FMV', notice_period_months: 12, status: 'Active' },
  { pi: 1, lease_name: 'Hudson Yards — Floors 41-48', counterparty: 'Related Companies', lease_type: 'Direct', role: 'Tenant', commencement_date: '2021-06-01', expiration_date: '2031-05-31', rentable_sqft: 220000, base_rent_annual: 20900000, escalation_pct: 2.75, opex_psf: 28, free_rent_months: 12, ti_allowance_psf: 120, security_deposit: 3500000, renewal_options: 'Two 5-year options', notice_period_months: 12, status: 'Active' },
  { pi: 2, lease_name: 'Domain Tech Center — Bldg C', counterparty: 'TIER REIT', lease_type: 'Direct', role: 'Tenant', commencement_date: '2022-01-15', expiration_date: '2027-01-14', rentable_sqft: 98000, base_rent_annual: 4116000, escalation_pct: 3, opex_psf: 14, free_rent_months: 4, ti_allowance_psf: 60, security_deposit: 685000, renewal_options: 'One 3-year option', notice_period_months: 9, status: 'Active' },
  { pi: 3, lease_name: 'River North Loft — Suite 500', counterparty: 'Sterling Bay', lease_type: 'Sublease', role: 'Tenant', commencement_date: '2020-09-01', expiration_date: '2026-08-31', rentable_sqft: 62000, base_rent_annual: 2480000, escalation_pct: 2.5, opex_psf: 16, free_rent_months: 3, ti_allowance_psf: 35, security_deposit: 410000, renewal_options: 'None', notice_period_months: 6, status: 'Active' },
  { pi: 4, lease_name: 'Seaport Innovation — Floors 6-7', counterparty: 'WS Development', lease_type: 'Direct', role: 'Tenant', commencement_date: '2023-04-01', expiration_date: '2030-03-31', rentable_sqft: 84000, base_rent_annual: 5460000, escalation_pct: 3, opex_psf: 24, free_rent_months: 6, ti_allowance_psf: 90, security_deposit: 910000, renewal_options: 'One 5-year option', notice_period_months: 12, status: 'Active' },
  { pi: 5, lease_name: 'Buckhead Plaza — Suite 1200', counterparty: 'Cousins Properties', lease_type: 'Direct', role: 'Tenant', commencement_date: '2021-11-01', expiration_date: '2026-10-31', rentable_sqft: 71000, base_rent_annual: 2485000, escalation_pct: 2.75, opex_psf: 13, free_rent_months: 5, ti_allowance_psf: 50, security_deposit: 415000, renewal_options: 'One 5-year option', notice_period_months: 9, status: 'Active' },
  { pi: 7, lease_name: 'Inland Empire DC — Whole Building', counterparty: 'Prologis', lease_type: 'Direct', role: 'Tenant', commencement_date: '2020-02-01', expiration_date: '2032-01-31', rentable_sqft: 410000, base_rent_annual: 5535000, escalation_pct: 3.5, opex_psf: 2.5, free_rent_months: 2, ti_allowance_psf: 8, security_deposit: 920000, renewal_options: 'Two 5-year options', notice_period_months: 12, status: 'Active' },
  { pi: 8, lease_name: 'Dallas Logistics Hub — Bays 1-8', counterparty: 'Duke Realty', lease_type: 'Direct', role: 'Tenant', commencement_date: '2022-07-01', expiration_date: '2029-06-30', rentable_sqft: 325000, base_rent_annual: 3412500, escalation_pct: 3, opex_psf: 1.8, free_rent_months: 3, ti_allowance_psf: 5, security_deposit: 570000, renewal_options: 'One 5-year option', notice_period_months: 12, status: 'Active' },
  { pi: 9, lease_name: 'Magnificent Mile Retail — Flagship', counterparty: 'Acadia Realty', lease_type: 'Direct', role: 'Tenant', commencement_date: '2018-05-01', expiration_date: '2026-12-31', rentable_sqft: 18000, base_rent_annual: 3600000, escalation_pct: 4, opex_psf: 35, free_rent_months: 0, ti_allowance_psf: 150, security_deposit: 600000, renewal_options: 'One 5-year option at 110% FMV', notice_period_months: 12, status: 'Active' },
  { pi: 10, lease_name: 'Miami Brickell Center — Floor 18', counterparty: 'Rilea Group', lease_type: 'Direct', role: 'Tenant', commencement_date: '2023-09-01', expiration_date: '2028-08-31', rentable_sqft: 76000, base_rent_annual: 4180000, escalation_pct: 3.25, opex_psf: 20, free_rent_months: 4, ti_allowance_psf: 70, security_deposit: 700000, renewal_options: 'One 5-year option', notice_period_months: 9, status: 'Active' },
  { pi: 11, lease_name: 'Seattle SLU — Floors 3-8', counterparty: 'Vulcan Real Estate', lease_type: 'Direct', role: 'Tenant', commencement_date: '2020-10-01', expiration_date: '2027-09-30', rentable_sqft: 132000, base_rent_annual: 7260000, escalation_pct: 3, opex_psf: 21, free_rent_months: 8, ti_allowance_psf: 95, security_deposit: 1210000, renewal_options: 'One 5-year option', notice_period_months: 12, status: 'Active' },
];

console.log(`Inserting ${leases.length} leases...`);
const insertLease = db.prepare(
  `INSERT INTO leases (property_id, lease_name, counterparty, lease_type, role, commencement_date, expiration_date,
     rentable_sqft, base_rent_annual, escalation_pct, opex_psf, free_rent_months, ti_allowance_psf,
     security_deposit, renewal_options, notice_period_months, status)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
for (const l of leases) {
  insertLease.run(propIds[l.pi], l.lease_name, l.counterparty, l.lease_type, l.role, l.commencement_date,
    l.expiration_date, l.rentable_sqft, l.base_rent_annual, l.escalation_pct, l.opex_psf, l.free_rent_months,
    l.ti_allowance_psf, l.security_deposit, l.renewal_options, l.notice_period_months, l.status);
}

interface TxSeed {
  name: string; pi: number | null; type: string; stage: string; market: string;
  target_sqft: number; estimated_value: number; probability: number;
  broker: string; lead: string; start_date: string; target_close_date: string; notes: string;
}

const transactions: TxSeed[] = [
  { name: 'SF HQ Renewal & Restack', pi: 0, type: 'Renewal', stage: 'Negotiation', market: 'SF Bay Area', target_sqft: 145000, estimated_value: 58000000, probability: 70, broker: 'CBRE', lead: 'A. Nguyen', start_date: '2025-09-01', target_close_date: '2026-03-31', notes: 'Targeting blend-and-extend; restack to consolidate 5 floors.' },
  { name: 'Chicago Loft Disposition', pi: 3, type: 'Disposition', stage: 'LOI', market: 'Chicago', target_sqft: 62000, estimated_value: 2100000, probability: 55, broker: 'JLL', lead: 'M. Torres', start_date: '2026-01-10', target_close_date: '2026-08-15', notes: 'Sublease expires 8/2026; marketing for early sublet of remaining term.' },
  { name: 'Phoenix Build-to-Suit', pi: null, type: 'New Lease', stage: 'Prospecting', market: 'Phoenix', target_sqft: 90000, estimated_value: 31000000, probability: 30, broker: 'Cushman & Wakefield', lead: 'R. Patel', start_date: '2026-02-01', target_close_date: '2027-01-31', notes: 'Evaluating BTS vs existing inventory near Sky Harbor.' },
  { name: 'Atlanta Buckhead Expansion', pi: 5, type: 'Expansion', stage: 'LOI', market: 'Atlanta', target_sqft: 25000, estimated_value: 8800000, probability: 60, broker: 'CBRE', lead: 'A. Nguyen', start_date: '2026-01-20', target_close_date: '2026-07-31', notes: 'Expand to full floor adjacent to existing suite.' },
  { name: 'Denver Tech New Lease', pi: 6, type: 'New Lease', stage: 'Legal', market: 'Denver', target_sqft: 55000, estimated_value: 19500000, probability: 85, broker: 'Newmark', lead: 'K. Olsen', start_date: '2025-11-01', target_close_date: '2026-07-01', notes: 'Lease out for signature; awaiting landlord redlines.' },
  { name: 'Austin Domain Renewal', pi: 2, type: 'Renewal', stage: 'Prospecting', market: 'Austin', target_sqft: 98000, estimated_value: 22000000, probability: 40, broker: 'JLL', lead: 'M. Torres', start_date: '2026-03-01', target_close_date: '2026-11-30', notes: 'Expiration 1/2027 — begin renewal strategy and market survey.' },
  { name: 'Nashville Market Entry', pi: null, type: 'Acquisition', stage: 'Prospecting', market: 'Nashville', target_sqft: 60000, estimated_value: 27000000, probability: 25, broker: 'Colliers', lead: 'R. Patel', start_date: '2026-04-01', target_close_date: '2027-03-31', notes: 'Strategic new market; lease vs buy analysis underway.' },
  { name: 'Dallas DC Lease Executed', pi: 8, type: 'New Lease', stage: 'Executed', market: 'Dallas-Fort Worth', target_sqft: 325000, estimated_value: 24000000, probability: 100, broker: 'Stream Realty', lead: 'K. Olsen', start_date: '2022-04-01', target_close_date: '2022-07-01', notes: 'Closed; included for pipeline history.' },
];

console.log(`Inserting ${transactions.length} transactions...`);
const insertTx = db.prepare(
  `INSERT INTO transactions (name, property_id, type, stage, market, target_sqft, estimated_value,
     probability, broker, lead, start_date, target_close_date, notes)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
for (const t of transactions) {
  insertTx.run(t.name, t.pi === null ? null : propIds[t.pi], t.type, t.stage, t.market, t.target_sqft,
    t.estimated_value, t.probability, t.broker, t.lead, t.start_date, t.target_close_date, t.notes);
}

console.log('Seed complete.');

import express from 'express';
import cors from 'cors';
import { db, initSchema } from './db.js';
import { crudRouter } from './crud.js';
import { compareLeaseVsBuy, buildLeaseCashflows, npv } from './finance.js';

initSchema();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PROPERTY_COLS = [
  'name', 'address', 'city', 'state', 'zip', 'country', 'lat', 'lng',
  'property_type', 'rentable_sqft', 'status', 'ownership', 'notes',
];
const LEASE_COLS = [
  'property_id', 'lease_name', 'counterparty', 'lease_type', 'role',
  'commencement_date', 'expiration_date', 'rentable_sqft', 'base_rent_annual',
  'escalation_pct', 'opex_psf', 'free_rent_months', 'ti_allowance_psf',
  'security_deposit', 'renewal_options', 'notice_period_months', 'status',
  'execution_date', 'rent_start_date', 'duration_months', 'usable_sqft',
  'loss_factor', 'building_type', 'property_use', 'lead_broker', 'rent_calc_type',
  'currency', 'parking_spaces', 'parking_rate_monthly', 'notes',
];
const TRANSACTION_COLS = [
  'name', 'property_id', 'lease_id', 'type', 'stage', 'market', 'target_sqft',
  'estimated_value', 'probability', 'broker', 'lead', 'start_date',
  'target_close_date', 'notes', 'links',
  'space_type', 'progress', 'date_needed_by', 'priority', 'assigned_to',
  'coi_status', 'deposit_status',
];

app.use('/api/properties', crudRouter('properties', PROPERTY_COLS));
app.use('/api/leases', crudRouter('leases', LEASE_COLS));
app.use('/api/transactions', crudRouter('transactions', TRANSACTION_COLS));

// --- Leases enriched with property info (for the lease admin grid) ---
app.get('/api/leases-enriched', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT l.*, p.name AS property_name, p.city AS property_city, p.state AS property_state
       FROM leases l LEFT JOIN properties p ON p.id = l.property_id
       ORDER BY l.expiration_date ASC`,
    )
    .all();
  res.json(rows);
});

// --- Rent schedule for a single lease ---
app.get('/api/leases/:id/schedule', (req, res) => {
  const lease: any = db.prepare('SELECT * FROM leases WHERE id = ?').get(Number(req.params.id));
  if (!lease) return res.status(404).json({ error: 'Not found' });
  const termYears = leaseTermYears(lease.commencement_date, lease.expiration_date);
  const rows = buildLeaseCashflows({
    rentableSqft: lease.rentable_sqft || 0,
    baseRentAnnual: lease.base_rent_annual || 0,
    escalationPct: lease.escalation_pct || 0,
    opexPsf: lease.opex_psf || 0,
    freeRentMonths: lease.free_rent_months || 0,
    tiAllowancePsf: lease.ti_allowance_psf || 0,
    termYears: Math.max(1, termYears),
    discountRate: 0.08,
  });
  res.json({ lease, termYears, schedule: rows });
});

// --- Financial: lease vs buy comparison ---
app.post('/api/financial/compare', (req, res) => {
  const { lease, buy } = req.body;
  if (!lease || !buy) return res.status(400).json({ error: 'lease and buy inputs required' });
  res.json(compareLeaseVsBuy(lease, buy));
});

// --- Financial: raw NPV helper ---
app.post('/api/financial/npv', (req, res) => {
  const { rate, cashflows } = req.body;
  if (typeof rate !== 'number' || !Array.isArray(cashflows))
    return res.status(400).json({ error: 'rate (number) and cashflows (array) required' });
  res.json({ npv: npv(rate, cashflows) });
});

// --- Scenarios CRUD (store inputs + computed result as JSON text) ---
app.get('/api/scenarios', (_req, res) => {
  const rows = db.prepare('SELECT * FROM scenarios ORDER BY id DESC').all();
  res.json(rows.map(parseScenario));
});
app.post('/api/scenarios', (req, res) => {
  const { name, property_id, discount_rate, term_years, inputs, result } = req.body;
  const info = db
    .prepare(
      `INSERT INTO scenarios (name, property_id, discount_rate, term_years, inputs, result)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      name,
      property_id ?? null,
      discount_rate ?? 0.08,
      term_years ?? 10,
      JSON.stringify(inputs ?? {}),
      JSON.stringify(result ?? {}),
    );
  const row = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(parseScenario(row));
});
app.delete('/api/scenarios/:id', (req, res) => {
  db.prepare('DELETE FROM scenarios WHERE id = ?').run(Number(req.params.id));
  res.status(204).end();
});

// --- Dashboard summary / portfolio KPIs ---
app.get('/api/dashboard', (_req, res) => {
  const properties: any[] = db.prepare('SELECT * FROM properties').all();
  const leases: any[] = db.prepare('SELECT * FROM leases').all();
  const transactions: any[] = db.prepare('SELECT * FROM transactions').all();

  const totalSqft = properties.reduce((s, p) => s + (p.rentable_sqft || 0), 0);
  const annualRent = leases
    .filter((l) => l.status === 'Active')
    .reduce((s, l) => s + (l.base_rent_annual || 0), 0);

  const today = new Date();
  const horizon = new Date();
  horizon.setMonth(horizon.getMonth() + 18);
  const criticalDates = leases
    .map((l) => ({
      leaseId: l.id,
      leaseName: l.lease_name,
      type: 'Expiration',
      date: l.expiration_date,
    }))
    .filter((d) => d.date && new Date(d.date) >= today && new Date(d.date) <= horizon)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));

  const pipelineValue = transactions
    .filter((t) => !['Closed', 'Executed', 'Dead'].includes(t.stage))
    .reduce((s, t) => s + (t.estimated_value || 0) * ((t.probability || 0) / 100), 0);

  const byType: Record<string, number> = {};
  for (const p of properties) byType[p.property_type] = (byType[p.property_type] || 0) + 1;

  res.json({
    counts: {
      properties: properties.length,
      leases: leases.length,
      activeLeases: leases.filter((l) => l.status === 'Active').length,
      transactions: transactions.length,
    },
    totalSqft,
    annualRent,
    pipelineValue,
    weightedPipeline: pipelineValue,
    criticalDates,
    propertiesByType: byType,
  });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

function leaseTermYears(start?: string, end?: string): number {
  if (!start || !end) return 10;
  const ms = +new Date(end) - +new Date(start);
  return Math.max(1, Math.round(ms / (365.25 * 24 * 3600 * 1000)));
}

function parseScenario(row: any) {
  return {
    ...row,
    inputs: safeParse(row.inputs),
    result: safeParse(row.result),
  };
}
function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`CRETMDX API listening on http://localhost:${PORT}`);
});

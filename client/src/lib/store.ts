import type { Property, Lease, Transaction, DashboardData } from './types';
import { SEED_PROPERTIES, SEED_LEASES, SEED_TRANSACTIONS } from './seed';
import { regionForCountry } from './geo';

// Browser-only persistence layer. Replaces the REST backend with localStorage so
// the app can be served as a static site (GitHub Pages) or opened as a single file.

const KEY = 'cretmdx:v1';

interface DB {
  properties: Property[];
  leases: Lease[];
  transactions: Transaction[];
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch {
    /* fall through to seed */
  }
  const seeded: DB = {
    properties: structuredClone(SEED_PROPERTIES),
    leases: structuredClone(SEED_LEASES),
    transactions: structuredClone(SEED_TRANSACTIONS),
  };
  save(seeded);
  return seeded;
}

function save(db: DB): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* storage may be unavailable (private mode); keep in-memory only */
  }
}

let db: DB = load();

export function resetData(): void {
  localStorage.removeItem(KEY);
  db = load();
}

// Wipe to an empty portfolio. Unlike resetData(), this persists an empty store
// so the sample data does NOT get re-seeded on the next load.
export function clearData(): void {
  db = { properties: [], leases: [], transactions: [] };
  save(db);
}

// Full portfolio snapshot for export/backup.
export function exportData(): DB {
  return {
    properties: db.properties,
    leases: db.leases,
    transactions: db.transactions,
  };
}

// Replace the portfolio with imported data (used by Import / restore).
export function importData(d: Partial<DB>): void {
  db = {
    properties: Array.isArray(d.properties) ? d.properties : [],
    leases: Array.isArray(d.leases) ? d.leases : [],
    transactions: Array.isArray(d.transactions) ? d.transactions : [],
  };
  save(db);
}

const nextId = (rows: { id: number }[]) => rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;

// ---- Properties ----
export const store = {
  listProperties: (): Property[] => [...db.properties].sort((a, b) => b.id - a.id),
  getProperty: (id: number) => db.properties.find((p) => p.id === id),
  createProperty: (body: Partial<Property>): Property => {
    const row = { ...body, id: nextId(db.properties) } as Property;
    db.properties.push(row);
    save(db);
    return row;
  },
  updateProperty: (id: number, body: Partial<Property>): Property | undefined => {
    const p = db.properties.find((x) => x.id === id);
    if (p) Object.assign(p, body);
    save(db);
    return p;
  },
  deleteProperty: (id: number): void => {
    db.properties = db.properties.filter((p) => p.id !== id);
    db.leases = db.leases.filter((l) => l.property_id !== id);
    save(db);
  },

  // ---- Leases ----
  listLeasesEnriched: (): Lease[] => {
    return [...db.leases]
      .map((l) => {
        const p = db.properties.find((x) => x.id === l.property_id);
        return {
          ...l,
          property_name: p?.name,
          property_city: p?.city,
          property_state: p?.state,
        };
      })
      .sort((a, b) => (a.expiration_date || '').localeCompare(b.expiration_date || ''));
  },
  getLease: (id: number) => db.leases.find((l) => l.id === id),
  createLease: (body: Partial<Lease>): Lease => {
    const row = { ...body, id: nextId(db.leases) } as Lease;
    db.leases.push(row);
    save(db);
    return row;
  },
  updateLease: (id: number, body: Partial<Lease>): Lease | undefined => {
    const l = db.leases.find((x) => x.id === id);
    if (l) Object.assign(l, body);
    save(db);
    return l;
  },
  deleteLease: (id: number): void => {
    db.leases = db.leases.filter((l) => l.id !== id);
    save(db);
  },

  // ---- Transactions ----
  listTransactions: (): Transaction[] => [...db.transactions].sort((a, b) => b.id - a.id),
  createTransaction: (body: Partial<Transaction>): Transaction => {
    const row = { ...body, id: nextId(db.transactions) } as Transaction;
    db.transactions.push(row);
    save(db);
    return row;
  },
  updateTransaction: (id: number, body: Partial<Transaction>): Transaction | undefined => {
    const t = db.transactions.find((x) => x.id === id);
    if (t) Object.assign(t, body);
    save(db);
    return t;
  },
  deleteTransaction: (id: number): void => {
    db.transactions = db.transactions.filter((t) => t.id !== id);
    save(db);
  },

  // ---- Dashboard ----
  dashboard: (): DashboardData => dashboardFrom(db.properties, db.leases, db.transactions),
};

// Pure dashboard rollup, shared by the local store and the Supabase backend.
export function dashboardFrom(
  properties: Property[],
  leases: Lease[],
  transactions: Transaction[],
): DashboardData {
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
  const byRegion: Record<string, number> = {};
  const sqftByRegion: Record<string, number> = {};
  for (const p of properties) {
    byType[p.property_type] = (byType[p.property_type] || 0) + 1;
    const region = regionForCountry(p.country);
    byRegion[region] = (byRegion[region] || 0) + 1;
    sqftByRegion[region] = (sqftByRegion[region] || 0) + (p.rentable_sqft || 0);
  }

  return {
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
    propertiesByRegion: byRegion,
    sqftByRegion,
  };
}

export function leaseTermYears(start?: string, end?: string): number {
  if (!start || !end) return 10;
  const ms = +new Date(end) - +new Date(start);
  return Math.max(1, Math.round(ms / (365.25 * 24 * 3600 * 1000)));
}

import type {
  Property,
  Lease,
  Transaction,
  DashboardData,
  ScheduleRow,
  ComparisonResult,
} from './types';
import { store, leaseTermYears, resetData, dashboardFrom } from './store';
import { buildLeaseCashflows, compareLeaseVsBuy } from './finance';
import { isSupabaseConfigured } from './supabase';
import * as cloud from './cloud';

// Unified data API. When Supabase is configured the app reads/writes the shared
// cloud database; otherwise it falls back to the browser-only localStorage store
// (offline / single-file mode). Every page calls this same async surface, so the
// switch between backends is invisible to the UI.

const ok = <T>(v: T): Promise<T> => Promise.resolve(v);
const useCloud = () => isSupabaseConfigured();

function scheduleFor(lease: Lease): { lease: Lease; termYears: number; schedule: ScheduleRow[] } {
  const termYears = leaseTermYears(lease.commencement_date, lease.expiration_date);
  const schedule = buildLeaseCashflows({
    rentableSqft: lease.rentable_sqft || 0,
    baseRentAnnual: lease.base_rent_annual || 0,
    escalationPct: lease.escalation_pct || 0,
    opexPsf: lease.opex_psf || 0,
    freeRentMonths: lease.free_rent_months || 0,
    tiAllowancePsf: lease.ti_allowance_psf || 0,
    termYears: Math.max(1, termYears),
    discountRate: 0.08,
  });
  return { lease, termYears, schedule };
}

export const api = {
  dashboard: async (): Promise<DashboardData> => {
    if (useCloud()) {
      const [properties, leases, transactions] = await Promise.all([
        cloud.listProperties(),
        cloud.listLeasesEnriched(),
        cloud.listTransactions(),
      ]);
      return dashboardFrom(properties, leases, transactions);
    }
    return store.dashboard();
  },

  // Properties
  properties: () => (useCloud() ? cloud.listProperties() : ok(store.listProperties())),
  property: (id: number) =>
    useCloud() ? cloud.getProperty(id).then((p) => p as Property) : ok(store.getProperty(id) as Property),
  createProperty: (body: Partial<Property>) =>
    useCloud() ? cloud.createProperty(body) : ok(store.createProperty(body)),
  updateProperty: (id: number, body: Partial<Property>) =>
    useCloud() ? cloud.updateProperty(id, body) : ok(store.updateProperty(id, body) as Property),
  deleteProperty: (id: number) =>
    useCloud() ? cloud.deleteProperty(id) : ok(store.deleteProperty(id)),

  // Leases
  leases: () => (useCloud() ? cloud.listLeasesEnriched() : ok(store.listLeasesEnriched())),
  lease: (id: number) =>
    useCloud() ? cloud.getLease(id).then((l) => l as Lease) : ok(store.getLease(id) as Lease),
  leaseSchedule: async (id: number) => {
    if (useCloud()) {
      const [raw, props] = await Promise.all([cloud.getLease(id), cloud.listProperties()]);
      const prop = props.find((p) => p.id === raw!.property_id);
      const lease: Lease = {
        ...(raw as Lease),
        property_name: prop?.name,
        property_city: prop?.city,
        property_state: prop?.state,
      };
      return scheduleFor(lease);
    }
    const raw = store.getLease(id) as Lease;
    const prop = store.listProperties().find((p) => p.id === raw.property_id);
    const lease: Lease = {
      ...raw,
      property_name: prop?.name,
      property_city: prop?.city,
      property_state: prop?.state,
    };
    return ok(scheduleFor(lease));
  },
  createLease: (body: Partial<Lease>) =>
    useCloud() ? cloud.createLease(body) : ok(store.createLease(body)),
  updateLease: (id: number, body: Partial<Lease>) =>
    useCloud() ? cloud.updateLease(id, body) : ok(store.updateLease(id, body) as Lease),
  deleteLease: (id: number) => (useCloud() ? cloud.deleteLease(id) : ok(store.deleteLease(id))),

  // Transactions
  transactions: () => (useCloud() ? cloud.listTransactions() : ok(store.listTransactions())),
  createTransaction: (body: Partial<Transaction>) =>
    useCloud() ? cloud.createTransaction(body) : ok(store.createTransaction(body)),
  updateTransaction: (id: number, body: Partial<Transaction>) =>
    useCloud()
      ? cloud.updateTransaction(id, body)
      : ok(store.updateTransaction(id, body) as Transaction),
  deleteTransaction: (id: number) =>
    useCloud() ? cloud.deleteTransaction(id) : ok(store.deleteTransaction(id)),

  // Financial (pure, client-side either way)
  compare: (lease: object, buy: object) =>
    ok<ComparisonResult>(compareLeaseVsBuy(lease as never, buy as never)),

  // Utility (local-only sample reset)
  reset: () => {
    resetData();
    return ok(undefined);
  },
};

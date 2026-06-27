import type {
  Property,
  Lease,
  Transaction,
  DashboardData,
  ScheduleRow,
  ComparisonResult,
} from './types';
import { store, leaseTermYears, resetData } from './store';
import { buildLeaseCashflows, compareLeaseVsBuy } from './finance';

// Browser-only API: same async surface the pages already use, backed by
// localStorage instead of a REST server. Swapping this file back to fetch()
// restores the full-stack mode without touching any page component.

const ok = <T>(v: T): Promise<T> => Promise.resolve(v);

export const api = {
  dashboard: () => ok<DashboardData>(store.dashboard()),

  // Properties
  properties: () => ok<Property[]>(store.listProperties()),
  property: (id: number) => ok(store.getProperty(id) as Property),
  createProperty: (body: Partial<Property>) => ok(store.createProperty(body)),
  updateProperty: (id: number, body: Partial<Property>) =>
    ok(store.updateProperty(id, body) as Property),
  deleteProperty: (id: number) => ok(store.deleteProperty(id)),

  // Leases
  leases: () => ok<Lease[]>(store.listLeasesEnriched()),
  lease: (id: number) => ok(store.getLease(id) as Lease),
  leaseSchedule: (id: number) => {
    const raw = store.getLease(id) as Lease;
    const prop = store.listProperties().find((p) => p.id === raw.property_id);
    const lease: Lease = {
      ...raw,
      property_name: prop?.name,
      property_city: prop?.city,
      property_state: prop?.state,
    };
    const termYears = leaseTermYears(lease.commencement_date, lease.expiration_date);
    const schedule: ScheduleRow[] = buildLeaseCashflows({
      rentableSqft: lease.rentable_sqft || 0,
      baseRentAnnual: lease.base_rent_annual || 0,
      escalationPct: lease.escalation_pct || 0,
      opexPsf: lease.opex_psf || 0,
      freeRentMonths: lease.free_rent_months || 0,
      tiAllowancePsf: lease.ti_allowance_psf || 0,
      termYears: Math.max(1, termYears),
      discountRate: 0.08,
    });
    return ok({ lease, termYears, schedule });
  },
  createLease: (body: Partial<Lease>) => ok(store.createLease(body)),
  updateLease: (id: number, body: Partial<Lease>) => ok(store.updateLease(id, body) as Lease),
  deleteLease: (id: number) => ok(store.deleteLease(id)),

  // Transactions
  transactions: () => ok<Transaction[]>(store.listTransactions()),
  createTransaction: (body: Partial<Transaction>) => ok(store.createTransaction(body)),
  updateTransaction: (id: number, body: Partial<Transaction>) =>
    ok(store.updateTransaction(id, body) as Transaction),
  deleteTransaction: (id: number) => ok(store.deleteTransaction(id)),

  // Financial
  compare: (lease: object, buy: object) =>
    ok<ComparisonResult>(compareLeaseVsBuy(lease as never, buy as never)),

  // Utility
  reset: () => {
    resetData();
    return ok(undefined);
  },
};

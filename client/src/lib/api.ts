import type {
  Property,
  Lease,
  Transaction,
  DashboardData,
  ScheduleRow,
  ComparisonResult,
} from './types';

const BASE = '/api';

async function http<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  dashboard: () => http<DashboardData>('/dashboard'),

  // Properties
  properties: () => http<Property[]>('/properties'),
  property: (id: number) => http<Property>(`/properties/${id}`),
  createProperty: (body: Partial<Property>) =>
    http<Property>('/properties', { method: 'POST', body: JSON.stringify(body) }),
  updateProperty: (id: number, body: Partial<Property>) =>
    http<Property>(`/properties/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProperty: (id: number) => http<void>(`/properties/${id}`, { method: 'DELETE' }),

  // Leases
  leases: () => http<Lease[]>('/leases-enriched'),
  lease: (id: number) => http<Lease>(`/leases/${id}`),
  leaseSchedule: (id: number) =>
    http<{ lease: Lease; termYears: number; schedule: ScheduleRow[] }>(`/leases/${id}/schedule`),
  createLease: (body: Partial<Lease>) =>
    http<Lease>('/leases', { method: 'POST', body: JSON.stringify(body) }),
  updateLease: (id: number, body: Partial<Lease>) =>
    http<Lease>(`/leases/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteLease: (id: number) => http<void>(`/leases/${id}`, { method: 'DELETE' }),

  // Transactions
  transactions: () => http<Transaction[]>('/transactions'),
  createTransaction: (body: Partial<Transaction>) =>
    http<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(body) }),
  updateTransaction: (id: number, body: Partial<Transaction>) =>
    http<Transaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTransaction: (id: number) => http<void>(`/transactions/${id}`, { method: 'DELETE' }),

  // Financial
  compare: (lease: object, buy: object) =>
    http<ComparisonResult>('/financial/compare', {
      method: 'POST',
      body: JSON.stringify({ lease, buy }),
    }),
};

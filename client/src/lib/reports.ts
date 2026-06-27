import type { Property, Lease, Transaction } from './types';

// Pure report builders + CSV export helpers. All computed client-side from the
// browser store so reports work offline and on the static site.

export interface RentRollRow {
  lease: string;
  property: string;
  market: string;
  type: string;
  sqft: number;
  baseRentAnnual: number;
  rentPsf: number;
  opexPsf: number;
  commencement: string;
  expiration: string;
  status: string;
}

export function rentRoll(properties: Property[], leases: Lease[]): RentRollRow[] {
  const byId = new Map(properties.map((p) => [p.id, p]));
  return leases
    .map((l) => {
      const p = byId.get(l.property_id);
      return {
        lease: l.lease_name,
        property: p?.name || l.property_name || '—',
        market: p?.market || '—',
        type: `${l.role} · ${l.lease_type}`,
        sqft: l.rentable_sqft || 0,
        baseRentAnnual: l.base_rent_annual || 0,
        rentPsf: l.rentable_sqft ? l.base_rent_annual / l.rentable_sqft : 0,
        opexPsf: l.opex_psf || 0,
        commencement: l.commencement_date || '',
        expiration: l.expiration_date || '',
        status: l.status,
      };
    })
    .sort((a, b) => (a.expiration || '').localeCompare(b.expiration || ''));
}

export interface ExpirationYearRow {
  year: number;
  count: number;
  sqft: number;
  annualRent: number;
}

export function expirationSchedule(leases: Lease[]): ExpirationYearRow[] {
  const map = new Map<number, ExpirationYearRow>();
  for (const l of leases) {
    if (l.status !== 'Active' || !l.expiration_date) continue;
    const year = new Date(l.expiration_date).getFullYear();
    if (Number.isNaN(year)) continue;
    const row = map.get(year) || { year, count: 0, sqft: 0, annualRent: 0 };
    row.count += 1;
    row.sqft += l.rentable_sqft || 0;
    row.annualRent += l.base_rent_annual || 0;
    map.set(year, row);
  }
  return [...map.values()].sort((a, b) => a.year - b.year);
}

export interface ObligationRow {
  year: number;
  amount: number;
}

// Projects total contractual base rent by calendar year across active leases,
// applying each lease's annual escalation and prorating partial years.
export function futureObligations(leases: Lease[], years = 10): ObligationRow[] {
  const now = new Date();
  const startYear = now.getFullYear();
  const totals: Record<number, number> = {};
  for (let y = startYear; y < startYear + years; y++) totals[y] = 0;

  for (const l of leases) {
    if (l.status !== 'Active' || !l.commencement_date || !l.expiration_date) continue;
    const start = new Date(l.commencement_date);
    const end = new Date(l.expiration_date);
    if (Number.isNaN(+start) || Number.isNaN(+end)) continue;
    const monthly = (l.base_rent_annual || 0) / 12;
    const esc = (l.escalation_pct || 0) / 100;

    const cur = new Date(Math.max(+start, new Date(startYear, 0, 1).getTime()));
    cur.setDate(1);
    while (cur <= end && cur.getFullYear() < startYear + years) {
      const y = cur.getFullYear();
      if (y >= startYear) {
        const yearsSince = Math.max(0, Math.floor((+cur - +start) / (365.25 * 24 * 3600 * 1000)));
        totals[y] += monthly * Math.pow(1 + esc, yearsSince);
      }
      cur.setMonth(cur.getMonth() + 1);
    }
  }
  return Object.entries(totals).map(([year, amount]) => ({ year: Number(year), amount }));
}

export interface CriticalDateRow {
  lease: string;
  property: string;
  event: string;
  date: string;
  daysRemaining: number;
  sqft: number;
  annualRent: number;
}

export function criticalDates(
  properties: Property[],
  leases: Lease[],
  horizonMonths = 24,
): CriticalDateRow[] {
  const byId = new Map(properties.map((p) => [p.id, p]));
  const today = new Date();
  const horizon = new Date();
  horizon.setMonth(horizon.getMonth() + horizonMonths);
  const rows: CriticalDateRow[] = [];

  const push = (l: Lease, event: string, dateStr: string) => {
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (Number.isNaN(+d) || d < today || d > horizon) return;
    rows.push({
      lease: l.lease_name,
      property: byId.get(l.property_id)?.name || l.property_name || '—',
      event,
      date: dateStr,
      daysRemaining: Math.round((+d - +today) / (1000 * 60 * 60 * 24)),
      sqft: l.rentable_sqft || 0,
      annualRent: l.base_rent_annual || 0,
    });
  };

  for (const l of leases) {
    if (l.status !== 'Active') continue;
    push(l, 'Expiration', l.expiration_date);
    if (l.expiration_date && l.notice_period_months) {
      const notice = new Date(l.expiration_date);
      notice.setMonth(notice.getMonth() - l.notice_period_months);
      push(l, 'Renewal/Notice Deadline', notice.toISOString().slice(0, 10));
    }
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export interface PipelineRow {
  stage: string;
  count: number;
  grossValue: number;
  weightedValue: number;
}

const STAGE_ORDER = ['Prospecting', 'LOI', 'Negotiation', 'Legal', 'Executed', 'Closed'];

export function pipelineByStage(transactions: Transaction[]): PipelineRow[] {
  const map = new Map<string, PipelineRow>();
  for (const t of transactions) {
    const row = map.get(t.stage) || { stage: t.stage, count: 0, grossValue: 0, weightedValue: 0 };
    row.count += 1;
    row.grossValue += t.estimated_value || 0;
    row.weightedValue += (t.estimated_value || 0) * ((t.probability || 0) / 100);
    map.set(t.stage, row);
  }
  return [...map.values()].sort(
    (a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage),
  );
}

// ---- CSV export ----
function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

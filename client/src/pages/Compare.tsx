import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Lease } from '../lib/types';
import { leaseTermYears } from '../lib/store';
import { buildLeaseCashflows } from '../lib/finance';
import { usd, num, fmtDate } from '../lib/format';
import { Card, Select, Spinner } from '../components/ui';

interface Derived {
  termYears: number;
  rentPsf: number;
  effectiveRentPsf: number;
  totalBaseRent: number;
}

function derive(l: Lease): Derived {
  const termYears = Math.max(1, leaseTermYears(l.commencement_date, l.expiration_date));
  const rows = buildLeaseCashflows({
    rentableSqft: l.rentable_sqft || 0,
    baseRentAnnual: l.base_rent_annual || 0,
    escalationPct: l.escalation_pct || 0,
    opexPsf: l.opex_psf || 0,
    freeRentMonths: l.free_rent_months || 0,
    tiAllowancePsf: l.ti_allowance_psf || 0,
    termYears,
    discountRate: 0.08,
  });
  const totalNet = rows.reduce((s, r) => s + r.netCost, 0);
  const totalBaseRent = rows.reduce((s, r) => s + r.baseRent, 0);
  return {
    termYears,
    rentPsf: l.rentable_sqft ? l.base_rent_annual / l.rentable_sqft : 0,
    effectiveRentPsf: l.rentable_sqft ? totalNet / termYears / l.rentable_sqft : 0,
    totalBaseRent,
  };
}

type Dir = 'lower' | 'higher' | 'none';

interface Row {
  label: string;
  get: (l: Lease, d: Derived) => string | number;
  raw?: (l: Lease, d: Derived) => number;
  better?: Dir; // which direction is "better" for highlighting
}

const ROWS: Row[] = [
  { label: 'Property', get: (l) => l.property_name || '—' },
  { label: 'Counterparty', get: (l) => l.counterparty || '—' },
  { label: 'Type', get: (l) => `${l.role} · ${l.lease_type}` },
  { label: 'Commencement', get: (l) => fmtDate(l.commencement_date) },
  { label: 'Expiration', get: (l) => fmtDate(l.expiration_date) },
  { label: 'Term (years)', get: (_l, d) => d.termYears, raw: (_l, d) => d.termYears, better: 'none' },
  { label: 'Rentable SF', get: (l) => num(l.rentable_sqft), raw: (l) => l.rentable_sqft, better: 'none' },
  { label: 'Base Rent / yr', get: (l) => usd(l.base_rent_annual), raw: (l) => l.base_rent_annual, better: 'lower' },
  { label: 'Base Rent / SF', get: (_l, d) => `${usd(d.rentPsf, 2)}`, raw: (_l, d) => d.rentPsf, better: 'lower' },
  { label: 'Escalation', get: (l) => `${l.escalation_pct}%`, raw: (l) => l.escalation_pct, better: 'lower' },
  { label: 'OpEx / SF', get: (l) => usd(l.opex_psf, 2), raw: (l) => l.opex_psf, better: 'lower' },
  { label: 'Free Rent (mo)', get: (l) => l.free_rent_months, raw: (l) => l.free_rent_months, better: 'higher' },
  { label: 'TI Allowance / SF', get: (l) => usd(l.ti_allowance_psf, 2), raw: (l) => l.ti_allowance_psf, better: 'higher' },
  { label: 'Security Deposit', get: (l) => usd(l.security_deposit), raw: (l) => l.security_deposit, better: 'lower' },
  { label: 'Notice (mo)', get: (l) => l.notice_period_months, raw: (l) => l.notice_period_months, better: 'none' },
  { label: 'Renewal Options', get: (l) => l.renewal_options || 'None' },
  {
    label: 'Effective Rent / SF',
    get: (_l, d) => `${usd(d.effectiveRentPsf, 2)}`,
    raw: (_l, d) => d.effectiveRentPsf,
    better: 'lower',
  },
  {
    label: 'Total Base Rent (term)',
    get: (_l, d) => usd(d.totalBaseRent),
    raw: (_l, d) => d.totalBaseRent,
    better: 'lower',
  },
];

export default function Compare() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<(number | null)[]>([null, null]);

  useEffect(() => {
    api.leases().then((l) => {
      setLeases(l);
      setSelected([l[0]?.id ?? null, l[1]?.id ?? null]);
      setLoading(false);
    });
  }, []);

  const chosen = useMemo(
    () => selected.map((id) => leases.find((l) => l.id === id) || null),
    [selected, leases],
  );
  const derived = useMemo(() => chosen.map((l) => (l ? derive(l) : null)), [chosen]);

  function setSlot(i: number, id: number | null) {
    setSelected((s) => s.map((v, idx) => (idx === i ? id : v)));
  }
  function addColumn() {
    if (selected.length < 4) setSelected((s) => [...s, null]);
  }
  function removeColumn(i: number) {
    setSelected((s) => (s.length > 2 ? s.filter((_, idx) => idx !== i) : s));
  }

  if (loading) return <Spinner />;

  // For each highlightable row, find best/worst among chosen leases.
  function cellClass(row: Row, value: number | undefined): string {
    if (!row.better || row.better === 'none' || value === undefined) return '';
    const vals = chosen
      .map((l, i) => (l && derived[i] ? row.raw!(l, derived[i]!) : undefined))
      .filter((v): v is number => v !== undefined);
    if (vals.length < 2) return '';
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if (min === max) return '';
    const best = row.better === 'lower' ? min : max;
    const worst = row.better === 'lower' ? max : min;
    if (value === best) return 'bg-emerald-50 text-emerald-700 font-semibold';
    if (value === worst) return 'bg-rose-50 text-rose-700';
    return '';
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compare Leases</h1>
          <p className="text-sm text-slate-500">
            Side-by-side terms with the most favorable value highlighted per row
          </p>
        </div>
        {selected.length < 4 && (
          <button
            onClick={addColumn}
            className="flex-shrink-0 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            + Add column
          </button>
        )}
      </div>

      <Card className="overflow-x-auto scroll-touch">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="w-44 px-4 py-3 text-left text-xs uppercase tracking-wide text-slate-500">
                Term
              </th>
              {selected.map((id, i) => (
                <th key={i} className="px-4 py-3 text-left align-top">
                  <div className="flex items-start gap-1">
                    <Select value={id ?? ''} onChange={(e) => setSlot(i, e.target.value ? Number(e.target.value) : null)}>
                      <option value="">— Select lease —</option>
                      {leases.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.lease_name}
                        </option>
                      ))}
                    </Select>
                    {selected.length > 2 && (
                      <button
                        onClick={() => removeColumn(i)}
                        className="mt-1.5 text-slate-300 hover:text-rose-500"
                        title="Remove column"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label} className="border-b border-slate-100">
                <td className="px-4 py-2.5 font-medium text-slate-600">{row.label}</td>
                {chosen.map((l, i) => {
                  const d = derived[i];
                  const value = l && d ? row.get(l, d) : '—';
                  const rawVal = l && d && row.raw ? row.raw(l, d) : undefined;
                  return (
                    <td key={i} className={`px-4 py-2.5 tabular-nums ${cellClass(row, rawVal)}`}>
                      {l ? value : <span className="text-slate-300">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="mt-4 text-xs text-slate-500">
        “Effective Rent / SF” is the straight-line average annual net occupancy cost per square foot
        (base rent + OpEx, less free rent and TI) over the lease term. Need a full lease-vs-buy
        analysis?{' '}
        <Link to="/financial" className="font-medium text-blue-600 hover:underline">
          Open Financial Modeling →
        </Link>
      </p>
    </div>
  );
}

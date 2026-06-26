import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api';
import type { ComparisonResult } from '../lib/types';
import { usd, usdCompact } from '../lib/format';
import { Card, Field, Input, SectionTitle, Spinner, StatCard } from '../components/ui';

interface LeaseIn {
  rentableSqft: number;
  baseRentAnnual: number;
  escalationPct: number;
  opexPsf: number;
  freeRentMonths: number;
  tiAllowancePsf: number;
  termYears: number;
  discountRate: number;
}
interface BuyIn {
  purchasePrice: number;
  downPaymentPct: number;
  loanRate: number;
  loanTermYears: number;
  opexPsf: number;
  rentableSqft: number;
  appreciationPct: number;
  sellingCostPct: number;
  holdYears: number;
  discountRate: number;
}

const DEFAULT_LEASE: LeaseIn = {
  rentableSqft: 50000,
  baseRentAnnual: 2000000,
  escalationPct: 3,
  opexPsf: 15,
  freeRentMonths: 4,
  tiAllowancePsf: 50,
  termYears: 10,
  discountRate: 0.08,
};
const DEFAULT_BUY: BuyIn = {
  purchasePrice: 35000000,
  downPaymentPct: 25,
  loanRate: 0.065,
  loanTermYears: 25,
  opexPsf: 12,
  rentableSqft: 50000,
  appreciationPct: 3,
  sellingCostPct: 5,
  holdYears: 10,
  discountRate: 0.08,
};

export default function Financial() {
  const [lease, setLease] = useState<LeaseIn>(DEFAULT_LEASE);
  const [buy, setBuy] = useState<BuyIn>(DEFAULT_BUY);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Keep the analysis horizon and discount rate in sync between the two scenarios.
  const syncedBuy: BuyIn = { ...buy, holdYears: lease.termYears, discountRate: lease.discountRate };

  async function run() {
    setLoading(true);
    try {
      const r = await api.compare(lease, syncedBuy);
      setResult(r);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cumulative = useMemo(() => {
    if (!result) return [];
    let leaseCum = 0;
    let buyCum = result.buy.initial;
    const rows: { year: string; Lease: number; Buy: number }[] = [
      { year: 'Y0', Lease: 0, Buy: Math.round(buyCum) },
    ];
    for (let i = 0; i < result.lease.rows.length; i++) {
      leaseCum += result.lease.rows[i].netCost;
      buyCum += result.buy.rows[i]?.netCost ?? 0;
      rows.push({
        year: `Y${i + 1}`,
        Lease: Math.round(leaseCum),
        Buy: Math.round(buyCum),
      });
    }
    return rows;
  }, [result]);

  const buyFavored = (result?.npvSavings ?? 0) > 0;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Financial Modeling</h1>
        <p className="text-sm text-slate-500">
          Lease vs. buy NPV comparison over a common analysis horizon
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle>Lease Scenario</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Rentable SF" v={lease.rentableSqft} on={(n) => setLease({ ...lease, rentableSqft: n })} />
            <NumField label="Base Rent / yr" v={lease.baseRentAnnual} on={(n) => setLease({ ...lease, baseRentAnnual: n })} />
            <NumField label="Escalation %" step="0.1" v={lease.escalationPct} on={(n) => setLease({ ...lease, escalationPct: n })} />
            <NumField label="OpEx $/sf" step="0.1" v={lease.opexPsf} on={(n) => setLease({ ...lease, opexPsf: n })} />
            <NumField label="Free Rent (mo)" v={lease.freeRentMonths} on={(n) => setLease({ ...lease, freeRentMonths: n })} />
            <NumField label="TI Allowance $/sf" v={lease.tiAllowancePsf} on={(n) => setLease({ ...lease, tiAllowancePsf: n })} />
            <NumField label="Term (years)" v={lease.termYears} on={(n) => setLease({ ...lease, termYears: n })} />
            <NumField label="Discount Rate" step="0.005" v={lease.discountRate} on={(n) => setLease({ ...lease, discountRate: n })} />
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle>Buy Scenario</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Purchase Price" v={buy.purchasePrice} on={(n) => setBuy({ ...buy, purchasePrice: n })} />
            <NumField label="Down Payment %" v={buy.downPaymentPct} on={(n) => setBuy({ ...buy, downPaymentPct: n })} />
            <NumField label="Loan Rate" step="0.005" v={buy.loanRate} on={(n) => setBuy({ ...buy, loanRate: n })} />
            <NumField label="Amort. (years)" v={buy.loanTermYears} on={(n) => setBuy({ ...buy, loanTermYears: n })} />
            <NumField label="OpEx $/sf" step="0.1" v={buy.opexPsf} on={(n) => setBuy({ ...buy, opexPsf: n })} />
            <NumField label="Appreciation %" step="0.1" v={buy.appreciationPct} on={(n) => setBuy({ ...buy, appreciationPct: n })} />
            <NumField label="Selling Cost %" step="0.1" v={buy.sellingCostPct} on={(n) => setBuy({ ...buy, sellingCostPct: n })} />
            <div className="flex items-end">
              <button
                onClick={run}
                className="w-full rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                {loading ? 'Calculating…' : 'Recalculate'}
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Hold period &amp; discount rate mirror the lease term ({lease.termYears} yrs @{' '}
            {(lease.discountRate * 100).toFixed(1)}%) for an apples-to-apples comparison.
          </p>
        </Card>
      </div>

      {!result ? (
        <Spinner label="Running analysis…" />
      ) : (
        <>
          <div
            className={`mt-6 rounded-xl border p-5 ${
              buyFavored ? 'border-emerald-200 bg-emerald-50' : 'border-blue-200 bg-blue-50'
            }`}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Recommendation
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{result.recommendation}</div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Lease NPV (cost)" value={usdCompact(result.lease.npv)} accent="blue" />
            <StatCard label="Buy NPV (cost)" value={usdCompact(result.buy.npv)} accent="emerald" />
            <StatCard
              label="NPV Advantage"
              value={usdCompact(Math.abs(result.npvSavings))}
              sub={buyFavored ? 'favors buying' : 'favors leasing'}
              accent={buyFavored ? 'emerald' : 'blue'}
            />
            <StatCard
              label="Lease Effective Rent"
              value={`${usd(result.lease.effectiveRentPsf, 2)}/sf`}
              sub="straight-line, per year"
              accent="violet"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <SectionTitle>Cumulative Cash Outflow</SectionTitle>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cumulative} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => usdCompact(v)} tick={{ fontSize: 11 }} width={55} />
                    <Tooltip formatter={(v: number) => usd(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="Lease" stroke="#2563eb" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Buy" stroke="#059669" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5">
              <SectionTitle>Annual Net Cost</SectionTitle>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={result.lease.rows.map((r, i) => ({
                      year: `Y${r.year}`,
                      Lease: Math.round(r.netCost),
                      Buy: Math.round(result.buy.rows[i]?.netCost ?? 0),
                    }))}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => usdCompact(v)} tick={{ fontSize: 11 }} width={55} />
                    <Tooltip formatter={(v: number) => usd(v)} />
                    <Legend />
                    <Bar dataKey="Lease" fill="#2563eb" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Buy" fill="#059669" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card className="mt-6 p-5">
            <SectionTitle>Year-by-Year Detail</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-2 text-left">Year</th>
                    <th className="px-3 py-2 text-right">Lease Base</th>
                    <th className="px-3 py-2 text-right">Lease OpEx</th>
                    <th className="px-3 py-2 text-right">Lease Net</th>
                    <th className="px-3 py-2 text-right">Buy Debt Svc</th>
                    <th className="px-3 py-2 text-right">Buy OpEx</th>
                    <th className="px-3 py-2 text-right">Sale Proceeds</th>
                    <th className="px-3 py-2 text-right">Buy Net</th>
                  </tr>
                </thead>
                <tbody>
                  {result.lease.rows.map((r, i) => {
                    const b = result.buy.rows[i];
                    return (
                      <tr key={r.year} className="border-b border-slate-100">
                        <td className="px-3 py-2">Year {r.year}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{usd(r.baseRent)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{usd(r.opex)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium text-blue-700">
                          {usd(r.netCost)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{usd(b?.debtService || 0)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{usd(b?.opex || 0)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-600">
                          {b?.saleProceeds ? usd(b.saleProceeds) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium text-emerald-700">
                          {usd(b?.netCost || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function NumField({
  label,
  v,
  on,
  step,
}: {
  label: string;
  v: number;
  on: (n: number) => void;
  step?: string;
}) {
  return (
    <Field label={label}>
      <Input type="number" step={step} value={v} onChange={(e) => on(parseFloat(e.target.value || '0'))} />
    </Field>
  );
}

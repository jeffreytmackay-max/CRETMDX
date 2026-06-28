import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api';
import type { Property, Lease, Transaction } from '../lib/types';
import { usd, usdCompact, num, fmtDate } from '../lib/format';
import {
  rentRoll,
  expirationSchedule,
  futureObligations,
  criticalDates,
  pipelineByStage,
  toCsv,
  downloadCsv,
} from '../lib/reports';
import { Button, Card, SectionTitle, Spinner, StatCard } from '../components/ui';
import { Monogram } from '../components/Logo';

type ReportKey = 'summary' | 'rentroll' | 'expirations' | 'obligations' | 'critical' | 'pipeline';

const REPORTS: { key: ReportKey; label: string }[] = [
  { key: 'summary', label: 'Portfolio Summary' },
  { key: 'rentroll', label: 'Rent Roll' },
  { key: 'expirations', label: 'Lease Expirations' },
  { key: 'obligations', label: 'Rent Obligations' },
  { key: 'critical', label: 'Critical Dates' },
  { key: 'pipeline', label: 'Deal Pipeline' },
];

const today = new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export default function Reports() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportKey>('summary');

  useEffect(() => {
    Promise.all([api.properties(), api.leases(), api.transactions()]).then(([p, l, t]) => {
      setProperties(p);
      setLeases(l);
      setTransactions(t);
      setLoading(false);
    });
  }, []);

  const data = useMemo(
    () => ({
      roll: rentRoll(properties, leases),
      exp: expirationSchedule(leases),
      obl: futureObligations(leases, 10),
      crit: criticalDates(properties, leases, 24),
      pipe: pipelineByStage(transactions),
    }),
    [properties, leases, transactions],
  );

  function exportCsv() {
    if (report === 'rentroll') {
      downloadCsv(
        'rent-roll.csv',
        toCsv(
          ['Lease', 'Property', 'State', 'Type', 'Rentable SF', 'Base Rent/yr', 'Rent/SF', 'OpEx/SF', 'Commencement', 'Expiration', 'Status'],
          data.roll.map((r) => [r.lease, r.property, r.state, r.type, r.sqft, Math.round(r.baseRentAnnual), r.rentPsf.toFixed(2), r.opexPsf.toFixed(2), r.commencement, r.expiration, r.status]),
        ),
      );
    } else if (report === 'expirations') {
      downloadCsv(
        'lease-expirations.csv',
        toCsv(['Year', 'Leases Expiring', 'Rentable SF', 'Annual Rent'], data.exp.map((r) => [r.year, r.count, r.sqft, Math.round(r.annualRent)])),
      );
    } else if (report === 'obligations') {
      downloadCsv(
        'rent-obligations.csv',
        toCsv(['Year', 'Projected Base Rent'], data.obl.map((r) => [r.year, Math.round(r.amount)])),
      );
    } else if (report === 'critical') {
      downloadCsv(
        'critical-dates.csv',
        toCsv(['Lease', 'Property', 'Event', 'Date', 'Days Remaining', 'Rentable SF', 'Annual Rent'], data.crit.map((r) => [r.lease, r.property, r.event, r.date, r.daysRemaining, r.sqft, Math.round(r.annualRent)])),
      );
    } else if (report === 'pipeline') {
      downloadCsv(
        'deal-pipeline.csv',
        toCsv(['Stage', 'Deals', 'Gross Value', 'Weighted Value'], data.pipe.map((r) => [r.stage, r.count, Math.round(r.grossValue), Math.round(r.weightedValue)])),
      );
    }
  }

  if (loading) return <Spinner />;

  const canCsv = report !== 'summary';
  const reportTitle = REPORTS.find((r) => r.key === report)!.label;

  return (
    <div className="report-page p-4 md:p-8">
      <div className="no-print mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">Generate, export, and print portfolio reports</p>
        </div>
        <div className="flex gap-2">
          {canCsv && (
            <Button variant="ghost" onClick={exportCsv}>
              ⤓ Export CSV
            </Button>
          )}
          <Button onClick={() => window.print()}>🖶 Print / Save PDF</Button>
        </div>
      </div>

      <div className="no-print mb-6 flex flex-wrap gap-2">
        {REPORTS.map((r) => (
          <button
            key={r.key}
            onClick={() => setReport(r.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              report === r.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Print header (visible on paper) */}
      <div className="mb-5 hidden items-center justify-between border-b-2 border-[#9D2235] pb-3 print:flex">
        <div className="flex items-center gap-2.5">
          <Monogram className="h-8 w-8 text-[#9D2235]" />
          <div className="leading-none">
            <div className="text-lg font-bold tracking-tight text-slate-900">TransMedics</div>
            <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Real Estate Portfolio
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-base font-semibold text-[#9D2235]">{reportTitle}</div>
          <div className="text-xs text-slate-500">Generated {today}</div>
        </div>
      </div>

      {report === 'summary' && <SummaryReport properties={properties} leases={leases} data={data} />}
      {report === 'rentroll' && <RentRollReport rows={data.roll} />}
      {report === 'expirations' && <ExpirationsReport rows={data.exp} />}
      {report === 'obligations' && <ObligationsReport rows={data.obl} />}
      {report === 'critical' && <CriticalReport rows={data.crit} />}
      {report === 'pipeline' && <PipelineReport rows={data.pipe} />}

      {/* Print footer (visible on paper) */}
      <div className="mt-8 hidden border-t border-slate-300 pt-2 text-[10px] uppercase tracking-wider text-slate-400 print:block">
        TransMedics — Real Estate Portfolio · Confidential · Generated {today}
      </div>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-4 py-2 text-xs uppercase tracking-wide text-slate-500 ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}
function Td({ children, right, bold }: { children: React.ReactNode; right?: boolean; bold?: boolean }) {
  return (
    <td className={`px-4 py-2 ${right ? 'text-right tabular-nums' : ''} ${bold ? 'font-semibold text-slate-800' : 'text-slate-700'}`}>
      {children}
    </td>
  );
}

interface ReportData {
  roll: ReturnType<typeof rentRoll>;
  exp: ReturnType<typeof expirationSchedule>;
  obl: ReturnType<typeof futureObligations>;
  crit: ReturnType<typeof criticalDates>;
  pipe: ReturnType<typeof pipelineByStage>;
}

function SummaryReport({
  properties,
  leases,
  data,
}: {
  properties: Property[];
  leases: Lease[];
  data: ReportData;
}) {
  const totalSqft = properties.reduce((s, p) => s + (p.rentable_sqft || 0), 0);
  const annualRent = leases.filter((l) => l.status === 'Active').reduce((s, l) => s + (l.base_rent_annual || 0), 0);
  const byType: Record<string, { count: number; sqft: number }> = {};
  for (const p of properties) {
    byType[p.property_type] = byType[p.property_type] || { count: 0, sqft: 0 };
    byType[p.property_type].count += 1;
    byType[p.property_type].sqft += p.rentable_sqft || 0;
  }
  const byState: Record<string, { count: number; sqft: number; rent: number }> = {};
  const propById = new Map(properties.map((p) => [p.id, p]));
  for (const l of leases) {
    const m = propById.get(l.property_id)?.state || '—';
    byState[m] = byState[m] || { count: 0, sqft: 0, rent: 0 };
    byState[m].count += 1;
    byState[m].sqft += l.rentable_sqft || 0;
    byState[m].rent += l.status === 'Active' ? l.base_rent_annual || 0 : 0;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Properties" value={num(properties.length)} accent="blue" />
        <StatCard label="Total Rentable SF" value={num(totalSqft)} accent="slate" />
        <StatCard label="Active Annual Rent" value={usdCompact(annualRent)} accent="violet" />
        <StatCard label="Blended Rent / SF" value={usd(totalSqft ? annualRent / totalSqft : 0, 2)} accent="emerald" />
      </div>

      <Card className="p-5">
        <SectionTitle>By Property Type</SectionTitle>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200"><Th>Type</Th><Th right>Properties</Th><Th right>Rentable SF</Th></tr></thead>
          <tbody>
            {Object.entries(byType).map(([t, v]) => (
              <tr key={t} className="border-b border-slate-100"><Td>{t}</Td><Td right>{num(v.count)}</Td><Td right>{num(v.sqft)}</Td></tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-5">
        <SectionTitle>By State</SectionTitle>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200"><Th>State</Th><Th right>Leases</Th><Th right>Rentable SF</Th><Th right>Active Rent/yr</Th></tr></thead>
          <tbody>
            {Object.entries(byState).sort((a, b) => b[1].rent - a[1].rent).map(([m, v]) => (
              <tr key={m} className="border-b border-slate-100"><Td>{m}</Td><Td right>{num(v.count)}</Td><Td right>{num(v.sqft)}</Td><Td right>{usd(v.rent)}</Td></tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-5 print:hidden">
        <SectionTitle>Projected Base Rent by Year</SectionTitle>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.obl.map((o) => ({ year: String(o.year), Rent: Math.round(o.amount) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => usdCompact(v)} tick={{ fontSize: 11 }} width={55} />
              <Tooltip formatter={(v: number) => usd(v)} />
              <Bar dataKey="Rent" fill="#9D2235" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function RentRollReport({ rows }: { rows: ReturnType<typeof rentRoll> }) {
  const totalSqft = rows.reduce((s, r) => s + r.sqft, 0);
  const totalRent = rows.reduce((s, r) => s + r.baseRentAnnual, 0);
  return (
    <Card className="overflow-x-auto scroll-touch p-0">
      <table className="w-full min-w-[820px] text-sm">
        <thead><tr className="border-b border-slate-200"><Th>Lease</Th><Th>State</Th><Th right>SF</Th><Th right>Base Rent/yr</Th><Th right>Rent/SF</Th><Th>Expiration</Th><Th>Status</Th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-100">
              <Td><span className="font-medium text-slate-800">{r.lease}</span><div className="text-xs text-slate-400">{r.property}</div></Td>
              <Td>{r.state}</Td><Td right>{num(r.sqft)}</Td><Td right>{usd(r.baseRentAnnual)}</Td>
              <Td right>{usd(r.rentPsf, 2)}</Td><Td>{fmtDate(r.expiration)}</Td><Td>{r.status}</Td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-300 bg-slate-50">
            <Td bold>Total · {rows.length} leases</Td><Td>—</Td><Td right bold>{num(totalSqft)}</Td><Td right bold>{usd(totalRent)}</Td>
            <Td right bold>{usd(totalSqft ? totalRent / totalSqft : 0, 2)}</Td><Td>—</Td><Td>—</Td>
          </tr>
        </tbody>
      </table>
    </Card>
  );
}

function ExpirationsReport({ rows }: { rows: ReturnType<typeof expirationSchedule> }) {
  return (
    <div className="space-y-6">
      <Card className="p-5 print:hidden">
        <SectionTitle>Rentable SF Expiring by Year</SectionTitle>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows.map((r) => ({ year: String(r.year), SF: r.sqft }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => num(v)} tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v: number) => `${num(v)} sf`} />
              <Bar dataKey="SF" fill="#FF7F41" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200"><Th>Year</Th><Th right>Leases Expiring</Th><Th right>Rentable SF</Th><Th right>Annual Rent at Risk</Th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year} className="border-b border-slate-100"><Td bold>{r.year}</Td><Td right>{r.count}</Td><Td right>{num(r.sqft)}</Td><Td right>{usd(r.annualRent)}</Td></tr>
            ))}
            {rows.length === 0 && <tr><Td>No active lease expirations on record.</Td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function ObligationsReport({ rows }: { rows: ReturnType<typeof futureObligations> }) {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return (
    <div className="space-y-6">
      <Card className="p-5 print:hidden">
        <SectionTitle>Projected Base Rent (next 10 years)</SectionTitle>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows.map((r) => ({ year: String(r.year), Rent: Math.round(r.amount) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => usdCompact(v)} tick={{ fontSize: 11 }} width={55} />
              <Tooltip formatter={(v: number) => usd(v)} />
              <Bar dataKey="Rent" fill="#44546A" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200"><Th>Year</Th><Th right>Projected Base Rent</Th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year} className="border-b border-slate-100"><Td bold>{r.year}</Td><Td right>{usd(r.amount)}</Td></tr>
            ))}
            <tr className="border-t-2 border-slate-300 bg-slate-50"><Td bold>10-Year Total</Td><Td right bold>{usd(total)}</Td></tr>
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-slate-500 print:hidden">
        Projection applies each active lease's annual escalation and prorates partial years; it
        reflects contractual base rent only (excludes OpEx, free rent, and TI).
      </p>
    </div>
  );
}

function CriticalReport({ rows }: { rows: ReturnType<typeof criticalDates> }) {
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[760px] text-sm">
        <thead><tr className="border-b border-slate-200"><Th>Date</Th><Th>Event</Th><Th>Lease</Th><Th right>Days</Th><Th right>SF</Th><Th right>Annual Rent</Th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-100">
              <Td bold>{fmtDate(r.date)}</Td>
              <Td>{r.event}</Td>
              <Td><span className="font-medium text-slate-800">{r.lease}</span><div className="text-xs text-slate-400">{r.property}</div></Td>
              <Td right><span className={r.daysRemaining <= 180 ? 'font-semibold text-rose-600' : ''}>{r.daysRemaining}</span></Td>
              <Td right>{num(r.sqft)}</Td><Td right>{usd(r.annualRent)}</Td>
            </tr>
          ))}
          {rows.length === 0 && <tr><Td>No critical dates in the next 24 months.</Td></tr>}
        </tbody>
      </table>
    </Card>
  );
}

function PipelineReport({ rows }: { rows: ReturnType<typeof pipelineByStage> }) {
  const totalGross = rows.reduce((s, r) => s + r.grossValue, 0);
  const totalWeighted = rows.reduce((s, r) => s + r.weightedValue, 0);
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-slate-200"><Th>Stage</Th><Th right>Deals</Th><Th right>Gross Value</Th><Th right>Weighted Value</Th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.stage} className="border-b border-slate-100"><Td bold>{r.stage}</Td><Td right>{r.count}</Td><Td right>{usd(r.grossValue)}</Td><Td right>{usd(r.weightedValue)}</Td></tr>
          ))}
          <tr className="border-t-2 border-slate-300 bg-slate-50"><Td bold>Total</Td><Td right bold>{rows.reduce((s, r) => s + r.count, 0)}</Td><Td right bold>{usd(totalGross)}</Td><Td right bold>{usd(totalWeighted)}</Td></tr>
        </tbody>
      </table>
    </Card>
  );
}

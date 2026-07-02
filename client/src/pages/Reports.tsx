import { Fragment, useEffect, useMemo, useState } from 'react';
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
import { usd, usdCompact, num, fmtDate, monthsUntil } from '../lib/format';
import {
  rentRoll,
  expirationSchedule,
  expirationByRegion,
  futureObligations,
  criticalDates,
  pipelineByStage,
  toCsv,
  downloadCsv,
} from '../lib/reports';
import { Button, Card, Select, SectionTitle, Spinner, StatCard } from '../components/ui';
import { Monogram } from '../components/Logo';
import { regionForCountry, REGIONS } from '../lib/geo';

type ReportKey =
  | 'summary'
  | 'rentroll'
  | 'expirations'
  | 'gantt'
  | 'obligations'
  | 'critical'
  | 'pipeline';

const REPORTS: { key: ReportKey; label: string }[] = [
  { key: 'summary', label: 'Portfolio Summary' },
  { key: 'rentroll', label: 'Rent Roll' },
  { key: 'expirations', label: 'Lease Expirations' },
  { key: 'gantt', label: 'Lease Timeline' },
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

  // Interactive filters — narrow the dataset that feeds every report/chart.
  const [fType, setFType] = useState('All');
  const [fOwnership, setFOwnership] = useState('All');
  const [fRegion, setFRegion] = useState('All');
  const [fState, setFState] = useState('All');
  const [fStatus, setFStatus] = useState('All');

  useEffect(() => {
    Promise.all([api.properties(), api.leases(), api.transactions()]).then(([p, l, t]) => {
      setProperties(p);
      setLeases(l);
      setTransactions(t);
      setLoading(false);
    });
  }, []);

  const distinct = (vals: (string | undefined)[]) =>
    Array.from(new Set(vals.filter((v): v is string => !!v))).sort();
  const typeOptions = useMemo(() => distinct(properties.map((p) => p.property_type)), [properties]);
  const ownershipOptions = useMemo(() => distinct(properties.map((p) => p.ownership)), [properties]);
  const regionOptions = useMemo(() => {
    const present = new Set(properties.map((p) => regionForCountry(p.country)));
    return [...REGIONS, 'Other'].filter((r) => present.has(r));
  }, [properties]);
  const stateOptions = useMemo(() => distinct(properties.map((p) => p.state)), [properties]);
  const statusOptions = useMemo(() => distinct(leases.map((l) => l.status)), [leases]);

  const propFilterActive =
    fType !== 'All' || fOwnership !== 'All' || fRegion !== 'All' || fState !== 'All';
  const filtersActive = propFilterActive || fStatus !== 'All';

  const filteredProperties = useMemo(
    () =>
      properties.filter(
        (p) =>
          (fType === 'All' || p.property_type === fType) &&
          (fOwnership === 'All' || p.ownership === fOwnership) &&
          (fRegion === 'All' || regionForCountry(p.country) === fRegion) &&
          (fState === 'All' || p.state === fState),
      ),
    [properties, fType, fOwnership, fRegion, fState],
  );
  const filteredLeases = useMemo(() => {
    const ids = new Set(filteredProperties.map((p) => p.id));
    return leases.filter((l) => {
      if (fStatus !== 'All' && l.status !== fStatus) return false;
      // With no property-level filter, include every lease (even unassigned);
      // with a filter active, keep only leases on matching properties.
      if (!propFilterActive) return true;
      return l.property_id != null && ids.has(l.property_id);
    });
  }, [leases, filteredProperties, fStatus, propFilterActive]);
  const filteredTransactions = useMemo(() => {
    if (!propFilterActive) return transactions;
    const ids = new Set(filteredProperties.map((p) => p.id));
    return transactions.filter((t) => t.property_id != null && ids.has(t.property_id));
  }, [transactions, filteredProperties, propFilterActive]);

  function resetFilters() {
    setFType('All');
    setFOwnership('All');
    setFRegion('All');
    setFState('All');
    setFStatus('All');
  }

  const data = useMemo(
    () => ({
      roll: rentRoll(filteredProperties, filteredLeases),
      exp: expirationSchedule(filteredLeases),
      expRegion: expirationByRegion(filteredProperties, filteredLeases),
      obl: futureObligations(filteredLeases, 10),
      crit: criticalDates(filteredProperties, filteredLeases, 24),
      pipe: pipelineByStage(filteredTransactions),
    }),
    [filteredProperties, filteredLeases, filteredTransactions],
  );

  function exportCsv() {
    if (report === 'rentroll') {
      downloadCsv(
        'rent-roll.csv',
        toCsv(
          ['Region', 'Lease', 'Property', 'State', 'Type', 'Rentable SF', 'Base Rent/yr', 'Rent/SF', 'OpEx/SF', 'Commencement', 'Expiration', 'Status'],
          data.roll.map((r) => [r.region, r.lease, r.property, r.state, r.type, r.sqft, Math.round(r.baseRentAnnual), r.rentPsf.toFixed(2), r.opexPsf.toFixed(2), r.commencement, r.expiration, r.status]),
        ),
      );
    } else if (report === 'expirations') {
      downloadCsv(
        'lease-expirations.csv',
        toCsv(
          ['Region', 'Year', 'Leases Expiring', 'Rentable SF', 'Annual Rent'],
          data.expRegion.flatMap((g) =>
            g.rows.map((r) => [g.region, r.year, r.count, r.sqft, Math.round(r.annualRent)]),
          ),
        ),
      );
    } else if (report === 'gantt') {
      const rows = [...filteredLeases]
        .filter((l) => l.expiration_date)
        .sort((a, b) => (a.expiration_date || '').localeCompare(b.expiration_date || ''));
      downloadCsv(
        'lease-timeline.csv',
        toCsv(
          ['Lease', 'Property', 'Commencement', 'Expiration', 'Months to Expiry', 'Status'],
          rows.map((l) => [
            l.lease_name,
            l.property_name || '',
            l.commencement_date || '',
            l.expiration_date || '',
            monthsUntil(l.expiration_date),
            l.status,
          ]),
        ),
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

      <div className="no-print mb-4 flex flex-wrap gap-2">
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

      {/* Interactive filters — apply to every report */}
      <div className="no-print mb-6 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect label="Property Type" value={fType} onChange={setFType} options={typeOptions} />
          <FilterSelect label="Ownership" value={fOwnership} onChange={setFOwnership} options={ownershipOptions} />
          <FilterSelect label="Region" value={fRegion} onChange={setFRegion} options={regionOptions} />
          <FilterSelect label="State" value={fState} onChange={setFState} options={stateOptions} />
          <FilterSelect label="Lease Status" value={fStatus} onChange={setFStatus} options={statusOptions} />
          {filtersActive && (
            <Button variant="ghost" onClick={resetFilters}>
              Reset filters
            </Button>
          )}
        </div>
        <div className="mt-2 text-xs text-slate-500">
          Showing <strong>{filteredProperties.length}</strong> of {properties.length} properties ·{' '}
          <strong>{filteredLeases.length}</strong> of {leases.length} leases
          {filtersActive && <span className="text-blue-600"> · filters applied</span>}
        </div>
      </div>

      {/* Filters line on paper, when any filter is active */}
      {filtersActive && (
        <div className="mb-3 hidden text-xs text-slate-500 print:block">
          Filters — Type: {fType} · Ownership: {fOwnership} · Region: {fRegion} · State: {fState} ·
          Lease Status: {fStatus}
        </div>
      )}

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

      {report === 'summary' && (
        <SummaryReport properties={filteredProperties} leases={filteredLeases} data={data} />
      )}
      {report === 'rentroll' && <RentRollReport rows={data.roll} />}
      {report === 'expirations' && (
        <ExpirationsReport rows={data.exp} groups={data.expRegion} />
      )}
      {report === 'gantt' && <LeaseGanttReport leases={filteredLeases} />}
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

// Color a lease bar by how soon it expires.
function expiryColor(exp?: string): string {
  const m = monthsUntil(exp || '');
  if (m < 0) return '#94a3b8'; // expired — slate
  if (m <= 12) return '#9D2235'; // ≤ 1 yr — crimson
  if (m <= 24) return '#FF7F41'; // ≤ 2 yrs — coral
  return '#2E7D52'; // > 2 yrs — green
}

function GanttLegend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-3 w-4 rounded" style={{ background: color }} />
      {label}
    </span>
  );
}

// Horizontal Gantt of lease terms, each bar spanning commencement → expiration on
// a shared year axis, colored by time-to-expiry, with a "today" marker.
function LeaseGanttReport({ leases }: { leases: Lease[] }) {
  const rows = leases
    .map((l) => ({ l, start: +new Date(l.commencement_date), end: +new Date(l.expiration_date) }))
    .filter((r) => !Number.isNaN(r.start) && !Number.isNaN(r.end) && r.end > r.start)
    .sort((a, b) => a.end - b.end);

  if (rows.length === 0) {
    return (
      <Card className="p-5">
        <SectionTitle>Lease Timeline</SectionTitle>
        <p className="text-sm text-slate-500">
          No leases with both a commencement and expiration date to chart. Add those dates to a
          lease to see it here.
        </p>
      </Card>
    );
  }

  const today = new Date().getTime();
  const minMs = Math.min(today, ...rows.map((r) => r.start));
  const maxMs = Math.max(today, ...rows.map((r) => r.end));
  const span = maxMs - minMs || 1;
  const pct = (ms: number) => ((ms - minMs) / span) * 100;

  const startYear = new Date(minMs).getFullYear();
  const endYear = new Date(maxMs).getFullYear();
  const years: number[] = [];
  for (let y = startYear; y <= endYear + 1; y++) years.push(y);
  const yearMs = (y: number) => +new Date(y, 0, 1);
  const LABEL_W = 200;

  return (
    <Card className="p-5">
      <SectionTitle>Lease Timeline</SectionTitle>
      <div className="overflow-x-auto scroll-touch">
        <div className="min-w-[760px]">
          {/* Year axis */}
          <div className="relative h-5" style={{ marginLeft: LABEL_W }}>
            {years.map((y) => {
              const left = pct(yearMs(y));
              if (left < 0 || left > 100) return null;
              return (
                <span
                  key={y}
                  className="absolute -translate-x-1/2 text-[10px] text-slate-400"
                  style={{ left: `${left}%` }}
                >
                  {y}
                </span>
              );
            })}
          </div>

          <div className="relative border-t border-slate-200">
            {/* Gridlines + today marker behind the bars */}
            <div className="pointer-events-none absolute inset-0" style={{ marginLeft: LABEL_W }}>
              {years.map((y) => {
                const left = pct(yearMs(y));
                if (left < 0 || left > 100) return null;
                return (
                  <div
                    key={y}
                    className="absolute bottom-0 top-0 w-px bg-slate-100"
                    style={{ left: `${left}%` }}
                  />
                );
              })}
              <div
                className="absolute bottom-0 top-0 w-0.5 bg-blue-500/70"
                style={{ left: `${pct(today)}%` }}
                title="Today"
              />
            </div>

            {rows.map(({ l, start, end }) => (
              <div key={l.id} className="relative flex items-center border-b border-slate-50 py-1.5">
                <div className="shrink-0 pr-3" style={{ width: LABEL_W }}>
                  <div className="truncate text-xs font-medium text-slate-700">{l.lease_name}</div>
                  <div className="truncate text-[10px] text-slate-400">{l.property_name}</div>
                </div>
                <div className="relative h-5 flex-1">
                  <div
                    className="absolute top-1/2 h-3 -translate-y-1/2 rounded"
                    style={{
                      left: `${pct(start)}%`,
                      width: `${Math.max(0.6, pct(end) - pct(start))}%`,
                      background: expiryColor(l.expiration_date),
                    }}
                    title={`${l.lease_name}: ${fmtDate(l.commencement_date)} → ${fmtDate(
                      l.expiration_date,
                    )}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
        <GanttLegend color="#9D2235" label="≤ 1 yr to expiry" />
        <GanttLegend color="#FF7F41" label="≤ 2 yrs" />
        <GanttLegend color="#2E7D52" label="> 2 yrs" />
        <GanttLegend color="#94a3b8" label="Expired" />
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-0.5 bg-blue-500/70" /> Today
        </span>
      </div>
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-slate-500">{label}</div>
      <div className="w-44">
        <Select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="All">All</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
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

  // By region: property count + SF from properties, active rent from their leases.
  const byRegion: Record<string, { count: number; sqft: number; rent: number }> = {};
  const bump = (region: string) =>
    (byRegion[region] = byRegion[region] || { count: 0, sqft: 0, rent: 0 });
  for (const p of properties) {
    const r = bump(regionForCountry(p.country));
    r.count += 1;
    r.sqft += p.rentable_sqft || 0;
  }
  for (const l of leases) {
    const region = regionForCountry(propById.get(l.property_id)?.country);
    bump(region).rent += l.status === 'Active' ? l.base_rent_annual || 0 : 0;
  }
  const regionRows = [...REGIONS, 'Other']
    .filter((r) => byRegion[r])
    .map((r) => ({ region: r, ...byRegion[r] }));

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
        <SectionTitle>By Region</SectionTitle>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200"><Th>Region</Th><Th right>Properties</Th><Th right>Rentable SF</Th><Th right>Active Rent/yr</Th></tr></thead>
          <tbody>
            {regionRows.map((r) => (
              <tr key={r.region} className="border-b border-slate-100"><Td>{r.region}</Td><Td right>{num(r.count)}</Td><Td right>{num(r.sqft)}</Td><Td right>{usd(r.rent)}</Td></tr>
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

  // Group rows by region, in region order (rows keep their expiration sort).
  const byRegion = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!byRegion.has(r.region)) byRegion.set(r.region, []);
    byRegion.get(r.region)!.push(r);
  }
  const groups = [...REGIONS, 'Other']
    .filter((r) => byRegion.has(r))
    .map((region) => ({ region, rows: byRegion.get(region)! }));

  return (
    <Card className="overflow-x-auto scroll-touch p-0">
      <table className="w-full min-w-[820px] text-sm">
        <thead><tr className="border-b border-slate-200"><Th>Lease</Th><Th>State</Th><Th right>SF</Th><Th right>Base Rent/yr</Th><Th right>Rent/SF</Th><Th>Expiration</Th><Th>Status</Th></tr></thead>
        <tbody>
          {groups.map((g) => {
            const gSqft = g.rows.reduce((s, r) => s + r.sqft, 0);
            const gRent = g.rows.reduce((s, r) => s + r.baseRentAnnual, 0);
            return (
              <Fragment key={g.region}>
                <tr className="bg-slate-50/70">
                  <td colSpan={7} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {g.region} <span className="text-slate-400">· {g.rows.length} leases</span>
                  </td>
                </tr>
                {g.rows.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <Td><span className="font-medium text-slate-800">{r.lease}</span><div className="text-xs text-slate-400">{r.property}</div></Td>
                    <Td>{r.state}</Td><Td right>{num(r.sqft)}</Td><Td right>{usd(r.baseRentAnnual)}</Td>
                    <Td right>{usd(r.rentPsf, 2)}</Td><Td>{fmtDate(r.expiration)}</Td><Td>{r.status}</Td>
                  </tr>
                ))}
                <tr className="border-b border-slate-200 bg-slate-50/40 text-slate-600">
                  <Td>{g.region} subtotal</Td><Td>—</Td><Td right>{num(gSqft)}</Td><Td right>{usd(gRent)}</Td>
                  <Td right>{usd(gSqft ? gRent / gSqft : 0, 2)}</Td><Td>—</Td><Td>—</Td>
                </tr>
              </Fragment>
            );
          })}
          <tr className="border-t-2 border-slate-300 bg-slate-50">
            <Td bold>Total · {rows.length} leases</Td><Td>—</Td><Td right bold>{num(totalSqft)}</Td><Td right bold>{usd(totalRent)}</Td>
            <Td right bold>{usd(totalSqft ? totalRent / totalSqft : 0, 2)}</Td><Td>—</Td><Td>—</Td>
          </tr>
        </tbody>
      </table>
    </Card>
  );
}

function ExpirationsReport({
  rows,
  groups,
}: {
  rows: ReturnType<typeof expirationSchedule>;
  groups: ReturnType<typeof expirationByRegion>;
}) {
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
          <thead><tr className="border-b border-slate-200"><Th>Region / Year</Th><Th right>Leases Expiring</Th><Th right>Rentable SF</Th><Th right>Annual Rent at Risk</Th></tr></thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.region}>
                <tr className="bg-slate-50/70">
                  <td colSpan={4} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {g.region}
                  </td>
                </tr>
                {g.rows.map((r) => (
                  <tr key={r.year} className="border-b border-slate-100"><Td bold>{r.year}</Td><Td right>{r.count}</Td><Td right>{num(r.sqft)}</Td><Td right>{usd(r.annualRent)}</Td></tr>
                ))}
                <tr className="border-b border-slate-200 bg-slate-50/40 text-slate-600">
                  <Td>{g.region} subtotal</Td><Td right>{g.total.count}</Td><Td right>{num(g.total.sqft)}</Td><Td right>{usd(g.total.annualRent)}</Td>
                </tr>
              </Fragment>
            ))}
            {groups.length === 0 && <tr><Td>No active lease expirations on record.</Td></tr>}
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
        Built from each lease's rent schedule: base rent starts at the rent-commencement date (no
        rent during the free-rent period) and grows by each lease's escalation, so these totals tie
        to the per-lease rent tables. Excludes OpEx and TI.
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

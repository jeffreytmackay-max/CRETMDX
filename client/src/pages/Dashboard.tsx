import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api';
import type { DashboardData } from '../lib/types';
import { usd, usdCompact, num, fmtDate, daysUntil } from '../lib/format';
import { Card, StatCard, SectionTitle, Spinner } from '../components/ui';
import { backendEnabled } from '../lib/auth';
import { REGIONS } from '../lib/geo';

import { CHART_SERIES, REGION_COLOR } from '../lib/brand';

const TYPE_COLORS = CHART_SERIES;

const TIP_KEY = 'cretmdx:hideDataTip';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string>();
  const [mixBy, setMixBy] = useState<'type' | 'region'>('type');
  const [showTip, setShowTip] = useState(() => {
    try {
      return localStorage.getItem(TIP_KEY) !== '1';
    } catch {
      return true;
    }
  });

  function dismissTip() {
    setShowTip(false);
    try {
      localStorage.setItem(TIP_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="p-8 text-rose-600">Failed to load: {error}</div>;
  if (!data) return <Spinner />;

  const typeData = Object.entries(data.propertiesByType).map(([name, value]) => ({ name, value }));
  const regionRows = [...REGIONS, 'Other']
    .map((region) => ({
      region,
      count: data.propertiesByRegion[region] || 0,
      sqft: data.sqftByRegion[region] || 0,
    }))
    .filter((r) => r.count > 0);
  const maxRegionCount = Math.max(1, ...regionRows.map((r) => r.count));

  // Portfolio Mix pie — switchable between property type and region.
  const mixData =
    mixBy === 'region'
      ? regionRows.map((r) => ({ name: r.region, value: r.count }))
      : typeData;
  const mixColor = (name: string, i: number) =>
    mixBy === 'region' ? REGION_COLOR[name] || '#75787B' : TYPE_COLORS[i % TYPE_COLORS.length];
  const rentByYear = data.criticalDates.slice(0, 6).map((d) => ({
    name: d.leaseName.split('—')[0].trim().slice(0, 14),
    days: Math.max(0, daysUntil(d.date)),
  }));

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Portfolio Dashboard</h1>
        <p className="text-sm text-slate-500">
          Snapshot of occupancy, lease obligations, and the active deal pipeline.
        </p>
      </div>

      {showTip && (
        <div className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-[#44546A]/20 bg-[#44546A]/5 p-4">
          <div className="text-sm text-slate-700">
            <div className="font-semibold text-slate-900">Updating your data</div>
            <p className="mt-1 text-slate-600">
              Make all changes right here in the app — on{' '}
              <Link to="/properties" className="font-medium text-blue-600 hover:underline">
                Properties
              </Link>
              ,{' '}
              <Link to="/leases" className="font-medium text-blue-600 hover:underline">
                Lease Administration
              </Link>
              , and{' '}
              <Link to="/transactions" className="font-medium text-blue-600 hover:underline">
                Transactions
              </Link>
              .{' '}
              {backendEnabled()
                ? 'Edits save to the cloud and sync to every signed-in device automatically — no files or uploads needed.'
                : 'Edits save in this browser. Connect the cloud backend in Settings to sync across devices.'}
            </p>
          </div>
          <button
            onClick={dismissTip}
            aria-label="Dismiss"
            className="shrink-0 rounded-full px-2 py-0.5 text-lg leading-none text-slate-400 hover:bg-slate-200/60 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Properties"
          value={num(data.counts.properties)}
          sub={`${num(data.totalSqft)} rentable sq ft`}
          accent="blue"
        />
        <StatCard
          label="Active Leases"
          value={num(data.counts.activeLeases)}
          sub={`${num(data.counts.leases)} total on record`}
          accent="emerald"
        />
        <StatCard
          label="Annual Base Rent"
          value={usdCompact(data.annualRent)}
          sub="Current contractual obligation"
          accent="violet"
        />
        <StatCard
          label="Weighted Pipeline"
          value={usdCompact(data.weightedPipeline)}
          sub={`${num(data.counts.transactions)} transactions`}
          accent="amber"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle
            action={
              <Link to="/leases" className="text-sm font-medium text-blue-600 hover:underline">
                View all →
              </Link>
            }
          >
            Upcoming Critical Dates
          </SectionTitle>
          {data.criticalDates.length === 0 ? (
            <p className="text-sm text-slate-500">No lease events in the next 18 months.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.criticalDates.map((d) => {
                const days = daysUntil(d.date);
                const urgent = days <= 180;
                return (
                  <div key={d.leaseId} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{d.leaseName}</div>
                      <div className="text-xs text-slate-500">
                        {d.type} · {fmtDate(d.date)}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        urgent ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {days} days
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle
            action={
              <div className="flex items-center gap-1 rounded-full bg-slate-100 p-0.5 text-xs">
                {(['type', 'region'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMixBy(m)}
                    className={`rounded-full px-2.5 py-1 font-medium capitalize transition ${
                      mixBy === m ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            }
          >
            Portfolio Mix
          </SectionTitle>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={mixData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {mixData.map((d, i) => (
                    <Cell key={i} fill={mixColor(d.name, i)} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {mixData.map((t, i) => (
              <span key={t.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: mixColor(t.name, i) }}
                />
                {t.name} ({t.value})
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="p-5">
          <SectionTitle
            action={
              <Link to="/properties" className="text-sm font-medium text-blue-600 hover:underline">
                View by region →
              </Link>
            }
          >
            Properties by Region
          </SectionTitle>
          {regionRows.length === 0 ? (
            <p className="text-sm text-slate-500">No properties yet.</p>
          ) : (
            <div className="space-y-3">
              {regionRows.map((r) => (
                <div key={r.region} className="flex items-center gap-3">
                  <div className="w-32 shrink-0 text-sm text-slate-600">{r.region}</div>
                  <div className="flex-1">
                    <div
                      className="h-5 rounded"
                      style={{
                        width: `${Math.max(4, (r.count / maxRegionCount) * 100)}%`,
                        background: REGION_COLOR[r.region] || '#75787B',
                      }}
                    />
                  </div>
                  <div className="w-40 shrink-0 text-right text-sm tabular-nums text-slate-700">
                    <span className="font-semibold">{num(r.count)}</span>
                    <span className="text-slate-400"> · {num(r.sqft)} sf</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle>Days to Nearest Lease Events</SectionTitle>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rentByYear} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v} days`, 'Until event']} />
                <Bar dataKey="days" fill="#9D2235" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle>Quick Links</SectionTitle>
          <div className="space-y-2">
            <QuickLink to="/map" title="Location Map" desc="See all sites geographically" />
            <QuickLink to="/leases" title="Lease Administration" desc="Abstracts & rent schedules" />
            <QuickLink to="/transactions" title="Deal Pipeline" desc="Track active transactions" />
            <QuickLink to="/financial" title="Lease vs Buy" desc="Run an NPV comparison" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function QuickLink({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="block rounded-lg border border-slate-200 px-3 py-2.5 transition hover:border-blue-300 hover:bg-blue-50"
    >
      <div className="text-sm font-medium text-slate-800">{title}</div>
      <div className="text-xs text-slate-500">{desc}</div>
    </Link>
  );
}

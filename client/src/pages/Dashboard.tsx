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

const TYPE_COLORS = ['#2563eb', '#7c3aed', '#ea580c', '#d97706', '#65a30d', '#0891b2'];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="p-8 text-rose-600">Failed to load: {error}</div>;
  if (!data) return <Spinner />;

  const typeData = Object.entries(data.propertiesByType).map(([name, value]) => ({ name, value }));
  const rentByYear = data.criticalDates.slice(0, 6).map((d) => ({
    name: d.leaseName.split('—')[0].trim().slice(0, 14),
    days: Math.max(0, daysUntil(d.date)),
  }));

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Portfolio Dashboard</h1>
        <p className="text-sm text-slate-500">
          Snapshot of occupancy, lease obligations, and the active deal pipeline.
        </p>
      </div>

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
          <SectionTitle>Portfolio Mix</SectionTitle>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={typeData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {typeData.map((_, i) => (
                    <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {typeData.map((t, i) => (
              <span key={t.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: TYPE_COLORS[i % TYPE_COLORS.length] }}
                />
                {t.name} ({t.value})
              </span>
            ))}
          </div>
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
                <Bar dataKey="days" fill="#2563eb" radius={[4, 4, 0, 0]} />
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

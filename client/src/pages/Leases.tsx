import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api';
import type { Lease, Property, ScheduleRow } from '../lib/types';
import { usd, usdCompact, num, fmtDate, monthsUntil } from '../lib/format';
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
} from '../components/ui';

type Filter = 'all' | 'expiring' | 'active';

export default function Leases() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [detailId, setDetailId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Partial<Lease> | null>(null);

  const load = async () => {
    const [l, p] = await Promise.all([api.leases(), api.properties()]);
    setLeases(l);
    setProperties(p);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'expiring')
      return leases.filter((l) => {
        const m = monthsUntil(l.expiration_date);
        return m >= 0 && m <= 18;
      });
    if (filter === 'active') return leases.filter((l) => l.status === 'Active');
    return leases;
  }, [leases, filter]);

  async function save(form: Partial<Lease>) {
    if (form.id) await api.updateLease(form.id, form);
    else await api.createLease(form);
    setEditing(null);
    load();
  }
  async function remove(id: number) {
    if (!confirm('Delete this lease?')) return;
    await api.deleteLease(id);
    load();
  }

  if (loading) return <Spinner />;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lease Administration</h1>
          <p className="text-sm text-slate-500">
            Lease abstracts, critical dates, and rent schedules
          </p>
        </div>
        <Button onClick={() => setEditing({ status: 'Active', escalation_pct: 3, notice_period_months: 9 })}>
          + Add Lease
        </Button>
      </div>

      <div className="mb-4 flex gap-2">
        {(['all', 'active', 'expiring'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f === 'expiring' ? 'Expiring ≤ 18 mo' : f}
          </button>
        ))}
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Lease</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3 text-right">Sq Ft</th>
              <th className="px-5 py-3 text-right">Base Rent/yr</th>
              <th className="px-5 py-3">Expiration</th>
              <th className="px-5 py-3">Notice By</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => {
              const months = monthsUntil(l.expiration_date);
              const noticeDate = addMonths(l.expiration_date, -(l.notice_period_months || 0));
              const noticeMonths = monthsUntil(noticeDate);
              return (
                <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <button
                      className="font-medium text-slate-800 hover:text-blue-600 hover:underline"
                      onClick={() => setDetailId(l.id)}
                    >
                      {l.lease_name}
                    </button>
                    <div className="text-xs text-slate-400">
                      {l.property_name} · {l.counterparty}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge>{l.lease_type}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                    {num(l.rentable_sqft)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                    {usdCompact(l.base_rent_annual)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-slate-700">{fmtDate(l.expiration_date)}</div>
                    <ExpiryPill months={months} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-slate-700">{fmtDate(noticeDate)}</div>
                    {noticeMonths >= 0 && noticeMonths <= 6 && (
                      <span className="text-xs font-medium text-amber-600">action soon</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button
                      className="mr-3 text-xs font-medium text-blue-600 hover:underline"
                      onClick={() => setEditing(l)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-xs font-medium text-rose-600 hover:underline"
                      onClick={() => remove(l.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {detailId !== null && (
        <LeaseDetail id={detailId} onClose={() => setDetailId(null)} />
      )}
      {editing && (
        <LeaseForm
          initial={editing}
          properties={properties}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ExpiryPill({ months }: { months: number }) {
  if (months < 0) return <span className="text-xs font-medium text-slate-400">expired</span>;
  const cls =
    months <= 12 ? 'text-rose-600' : months <= 24 ? 'text-amber-600' : 'text-emerald-600';
  return <span className={`text-xs font-medium ${cls}`}>{months} mo remaining</span>;
}

function addMonths(date: string, months: number): string {
  if (!date) return '';
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function LeaseDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const [data, setData] = useState<{ lease: Lease; termYears: number; schedule: ScheduleRow[] } | null>(
    null,
  );
  useEffect(() => {
    api.leaseSchedule(id).then(setData);
  }, [id]);

  if (!data) {
    return (
      <Modal title="Lease Abstract" onClose={onClose}>
        <Spinner />
      </Modal>
    );
  }

  const { lease, termYears, schedule } = data;
  const totalRent = schedule.reduce((s, r) => s + r.baseRent, 0);
  const chartData = schedule.map((r) => ({
    year: `Y${r.year}`,
    'Base Rent': Math.round(r.baseRent),
    OpEx: Math.round(r.opex),
  }));

  const facts: [string, string][] = [
    ['Property', lease.property_name || '—'],
    ['Counterparty', lease.counterparty],
    ['Role / Type', `${lease.role} · ${lease.lease_type}`],
    ['Commencement', fmtDate(lease.commencement_date)],
    ['Expiration', fmtDate(lease.expiration_date)],
    ['Term', `${termYears} years`],
    ['Rentable SF', num(lease.rentable_sqft)],
    ['Base Rent (Yr 1)', usd(lease.base_rent_annual)],
    ['Escalation', `${lease.escalation_pct}% / yr`],
    ['OpEx', `${usd(lease.opex_psf, 2)} / sf`],
    ['Free Rent', `${lease.free_rent_months} months`],
    ['TI Allowance', `${usd(lease.ti_allowance_psf, 2)} / sf`],
    ['Security Deposit', usd(lease.security_deposit)],
    ['Notice Period', `${lease.notice_period_months} months`],
    ['Renewal Options', lease.renewal_options || 'None'],
  ];

  return (
    <Modal title={lease.lease_name} onClose={onClose}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {facts.map(([k, v]) => (
          <div key={k} className="contents">
            <span className="text-slate-500">{k}</span>
            <span className="text-right font-medium text-slate-800">{v}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 mb-1 text-sm font-semibold text-slate-700">
        Rent Schedule · {usd(totalRent)} total base rent
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v) => usdCompact(v)} tick={{ fontSize: 10 }} width={50} />
            <Tooltip formatter={(v: number) => usd(v)} />
            <Area type="monotone" dataKey="Base Rent" stackId="1" stroke="#2563eb" fill="#bfdbfe" />
            <Area type="monotone" dataKey="OpEx" stackId="1" stroke="#7c3aed" fill="#ddd6fe" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-slate-200">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-1.5 text-left">Year</th>
              <th className="px-3 py-1.5 text-right">Base Rent</th>
              <th className="px-3 py-1.5 text-right">OpEx</th>
              <th className="px-3 py-1.5 text-right">Free Rent</th>
              <th className="px-3 py-1.5 text-right">Net Cost</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((r) => (
              <tr key={r.year} className="border-t border-slate-100">
                <td className="px-3 py-1.5">Year {r.year}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{usd(r.baseRent)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{usd(r.opex)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-emerald-600">
                  {r.freeRent ? `(${usd(r.freeRent)})` : '—'}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums font-medium">{usd(r.netCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function LeaseForm({
  initial,
  properties,
  onSave,
  onClose,
}: {
  initial: Partial<Lease>;
  properties: Property[];
  onSave: (l: Partial<Lease>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Lease>>(initial);
  const set = (k: keyof Lease, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const numSet = (k: keyof Lease) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(k, parseFloat(e.target.value || '0'));

  return (
    <Modal title={form.id ? 'Edit Lease' : 'Add Lease'} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <Field label="Lease Name">
          <Input value={form.lease_name || ''} onChange={(e) => set('lease_name', e.target.value)} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Property">
            <Select
              value={form.property_id ?? ''}
              onChange={(e) => set('property_id', parseInt(e.target.value))}
            >
              <option value="">— Select —</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Counterparty">
            <Input value={form.counterparty || ''} onChange={(e) => set('counterparty', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Lease Type">
            <Select value={form.lease_type || 'Direct'} onChange={(e) => set('lease_type', e.target.value)}>
              <option>Direct</option>
              <option>Sublease</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status || 'Active'} onChange={(e) => set('status', e.target.value)}>
              <option>Active</option>
              <option>Pending</option>
              <option>Expired</option>
              <option>Terminated</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Commencement">
            <Input type="date" value={form.commencement_date || ''} onChange={(e) => set('commencement_date', e.target.value)} />
          </Field>
          <Field label="Expiration">
            <Input type="date" value={form.expiration_date || ''} onChange={(e) => set('expiration_date', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Rentable SF">
            <Input type="number" value={form.rentable_sqft ?? 0} onChange={numSet('rentable_sqft')} />
          </Field>
          <Field label="Base Rent/yr">
            <Input type="number" value={form.base_rent_annual ?? 0} onChange={numSet('base_rent_annual')} />
          </Field>
          <Field label="Escalation %">
            <Input type="number" step="0.1" value={form.escalation_pct ?? 0} onChange={numSet('escalation_pct')} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="OpEx $/sf">
            <Input type="number" step="0.1" value={form.opex_psf ?? 0} onChange={numSet('opex_psf')} />
          </Field>
          <Field label="Free Rent (mo)">
            <Input type="number" value={form.free_rent_months ?? 0} onChange={numSet('free_rent_months')} />
          </Field>
          <Field label="Notice (mo)">
            <Input type="number" value={form.notice_period_months ?? 0} onChange={numSet('notice_period_months')} />
          </Field>
        </div>
        <Field label="Renewal Options">
          <Input value={form.renewal_options || ''} onChange={(e) => set('renewal_options', e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}

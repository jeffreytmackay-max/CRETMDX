import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { Lease, LeaseInsurance } from '../lib/types';
import { num, fmtDate, monthsUntil, daysUntil } from '../lib/format';
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
  StatCard,
  Textarea,
} from '../components/ui';
import { SortGroupBar } from '../components/SortGroupBar';
import { sortRows, groupRows, type SortDir, type SortOption, type GroupOption } from '../lib/table';

const COI_STATUSES = ['Not Required', 'Requested', 'Pending', 'On File', 'Expired'];

const ins = (l: Lease): LeaseInsurance => l.insurance || {};

const SORTS: SortOption<Lease>[] = [
  { key: 'expiration', label: 'Policy Expiration', get: (l) => ins(l).expiration_date || '' },
  { key: 'lease_name', label: 'Lease', get: (l) => l.lease_name || '' },
  { key: 'counterparty', label: 'Landlord', get: (l) => l.counterparty || '' },
  { key: 'carrier', label: 'Carrier', get: (l) => ins(l).carrier || '' },
  { key: 'status', label: 'COI Status', get: (l) => ins(l).coi_status || '' },
];
const GROUPS: GroupOption<Lease>[] = [
  { key: 'none', label: 'None', get: () => '' },
  {
    key: 'status',
    label: 'COI Status',
    get: (l) => ins(l).coi_status || '—',
    order: [...COI_STATUSES, '—'],
  },
  { key: 'property', label: 'Property', get: (l) => l.property_name || '—' },
  { key: 'landlord', label: 'Landlord', get: (l) => l.counterparty || '—' },
  {
    key: 'exp_year',
    label: 'Expiration Year',
    get: (l) => (ins(l).expiration_date ? ins(l).expiration_date!.slice(0, 4) : '—'),
  },
];

type Filter = 'all' | 'expiring' | 'expired' | 'onfile' | 'open';

export default function Insurance() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Lease | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sortKey, setSortKey] = useState('expiration');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [groupKey, setGroupKey] = useState('none');
  const navigate = useNavigate();

  const load = () =>
    api.leases().then((l) => {
      setLeases(l);
      setLoading(false);
    });
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let rows = leases;
    if (filter === 'expiring')
      rows = rows.filter((l) => {
        const d = ins(l).expiration_date;
        if (!d) return false;
        const du = daysUntil(d);
        return du >= 0 && du <= 60;
      });
    else if (filter === 'expired')
      rows = rows.filter((l) => {
        const d = ins(l).expiration_date;
        return d && daysUntil(d) < 0;
      });
    else if (filter === 'onfile') rows = rows.filter((l) => ins(l).coi_status === 'On File');
    else if (filter === 'open')
      rows = rows.filter((l) => {
        const s = ins(l).coi_status;
        return !s || s === 'Requested' || s === 'Pending';
      });

    const q = search.trim().toLowerCase();
    if (q)
      rows = rows.filter((l) =>
        [
          l.lease_name,
          l.counterparty,
          l.property_name,
          ins(l).carrier,
          ins(l).additional_insured,
          ins(l).certificate_holder,
          ins(l).broker_name,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      );
    return rows;
  }, [leases, filter, search]);

  const groups = useMemo(() => {
    const sorted = sortRows(filtered, SORTS.find((s) => s.key === sortKey), sortDir);
    const opt = groupKey === 'none' ? undefined : GROUPS.find((g) => g.key === groupKey);
    return groupRows(sorted, opt);
  }, [filtered, sortKey, sortDir, groupKey]);

  const stats = useMemo(() => {
    let onFile = 0;
    let expiring = 0;
    let expired = 0;
    for (const l of leases) {
      const i = ins(l);
      if (i.coi_status === 'On File') onFile++;
      if (i.expiration_date) {
        const du = daysUntil(i.expiration_date);
        if (du < 0) expired++;
        else if (du <= 60) expiring++;
      }
    }
    return { total: leases.length, onFile, expiring, expired };
  }, [leases]);

  async function save(id: number, insurance: LeaseInsurance) {
    await api.updateLease(id, { insurance });
    setEditing(null);
    load();
  }

  if (loading) return <Spinner />;

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Needs COI' },
    { key: 'expiring', label: 'Expiring ≤ 60 days' },
    { key: 'expired', label: 'Expired' },
    { key: 'onfile', label: 'On File' },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Certificates of Insurance</h1>
        <p className="text-sm text-slate-500">
          Insurance requirements and annual COI renewal tracking for every lease.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Leases" value={num(stats.total)} accent="blue" />
        <StatCard label="COI On File" value={num(stats.onFile)} accent="emerald" />
        <StatCard label="Expiring ≤ 60 days" value={num(stats.expiring)} accent="amber" />
        <StatCard label="Expired" value={num(stats.expired)} accent="rose" />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                filter === f.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="sm:w-64">
          <Input
            type="search"
            placeholder="Search lease, landlord, carrier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-4">
        <SortGroupBar
          sortKey={sortKey}
          setSortKey={setSortKey}
          sortDir={sortDir}
          setSortDir={setSortDir}
          groupKey={groupKey}
          setGroupKey={setGroupKey}
          sortChoices={SORTS}
          groupChoices={GROUPS}
        />
      </div>

      <Card className="overflow-x-auto scroll-touch">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Lease / Landlord</th>
              <th className="px-5 py-3">Property</th>
              <th className="px-5 py-3">Carrier</th>
              <th className="px-5 py-3">Additional Insured</th>
              <th className="px-5 py-3">COI Status</th>
              <th className="px-5 py-3">Policy Expiration</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.key || 'all'}>
                {groupKey !== 'none' && (
                  <tr className="bg-slate-50/70">
                    <td
                      colSpan={7}
                      className="px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {g.key} <span className="text-slate-400">· {g.rows.length}</span>
                    </td>
                  </tr>
                )}
                {g.rows.map((l) => {
                  const i = ins(l);
                  return (
                    <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <button
                          className="text-left font-medium text-slate-800 hover:text-blue-600 hover:underline"
                          onClick={() => setEditing(l)}
                        >
                          {l.lease_name}
                        </button>
                        <div className="text-xs text-slate-400">{l.counterparty || '—'}</div>
                      </td>
                      <td className="px-5 py-3">
                        {l.property_id && l.property_name ? (
                          <button
                            onClick={() => navigate(`/properties?expand=${l.property_id}`)}
                            className="text-left text-sm text-blue-600 hover:underline"
                          >
                            🏢 {l.property_name}
                          </button>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{i.carrier || '—'}</td>
                      <td className="px-5 py-3 text-slate-600">
                        <span className="line-clamp-2 max-w-[220px]">
                          {i.additional_insured || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <CoiBadge status={i.coi_status} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-slate-700">{fmtDate(i.expiration_date)}</div>
                        <ExpiryPill date={i.expiration_date} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          className="text-xs font-medium text-blue-600 hover:underline"
                          onClick={() => setEditing(l)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">
                  {leases.length === 0
                    ? 'No leases yet.'
                    : 'No leases match this filter.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {editing && (
        <CoiForm
          lease={editing}
          onSave={(data) => save(editing.id, data)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function CoiBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    'On File': 'bg-emerald-100 text-emerald-700',
    Requested: 'bg-amber-100 text-amber-700',
    Pending: 'bg-amber-100 text-amber-700',
    Expired: 'bg-rose-100 text-rose-700',
    'Not Required': 'bg-slate-100 text-slate-500',
  };
  const s = status || '—';
  const cls = map[s] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{s}</span>
  );
}

function ExpiryPill({ date }: { date?: string }) {
  if (!date) return null;
  const d = daysUntil(date);
  if (d < 0)
    return <span className="text-xs font-medium text-rose-600">expired {Math.abs(d)}d ago</span>;
  if (d <= 60) return <span className="text-xs font-medium text-amber-600">renew in {d}d</span>;
  const m = monthsUntil(date);
  return <span className="text-xs text-slate-400">{m} mo</span>;
}

function CoiForm({
  lease,
  onSave,
  onClose,
}: {
  lease: Lease;
  onSave: (data: LeaseInsurance) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<LeaseInsurance>(lease.insurance || {});
  const set = (k: keyof LeaseInsurance, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const money = (k: keyof LeaseInsurance) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(k, e.target.value === '' ? undefined : parseFloat(e.target.value));
  const check = (k: keyof LeaseInsurance, label: string) => (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={Boolean(form[k])}
        onChange={(e) => set(k, e.target.checked)}
        className="h-4 w-4 rounded border-slate-300"
      />
      {label}
    </label>
  );

  return (
    <Modal title={`Insurance — ${lease.lease_name}`} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <div className="text-xs text-slate-500">
          Landlord: <strong>{lease.counterparty || '—'}</strong>
          {lease.property_name ? ` · Property: ${lease.property_name}` : ''}
        </div>

        <Section title="Requirements & Parties">
          <Field label="Insurance Requirements">
            <Textarea
              rows={3}
              value={form.requirements || ''}
              onChange={(e) => set('requirements', e.target.value)}
              placeholder="Coverage the lease requires the tenant to carry…"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name of Insurance (Carrier)">
              <Input value={form.carrier || ''} onChange={(e) => set('carrier', e.target.value)} />
            </Field>
            <Field label="Policy Number">
              <Input
                value={form.policy_number || ''}
                onChange={(e) => set('policy_number', e.target.value)}
              />
            </Field>
          </div>
          <Field label="Additional Insured">
            <Textarea
              rows={2}
              value={form.additional_insured || ''}
              onChange={(e) => set('additional_insured', e.target.value)}
              placeholder="Entities that must be named as additional insured…"
            />
          </Field>
          <Field label="Certificate Holder">
            <Textarea
              rows={2}
              value={form.certificate_holder || ''}
              onChange={(e) => set('certificate_holder', e.target.value)}
              placeholder="Who the certificate is issued to (name + address)…"
            />
          </Field>
        </Section>

        <Section title="Coverage Limits ($)">
          <div className="grid grid-cols-2 gap-3">
            <Field label="CGL — Each Occurrence">
              <Input type="number" value={form.cgl_each_occurrence ?? ''} onChange={money('cgl_each_occurrence')} />
            </Field>
            <Field label="CGL — General Aggregate">
              <Input type="number" value={form.cgl_aggregate ?? ''} onChange={money('cgl_aggregate')} />
            </Field>
            <Field label="Automobile Liability">
              <Input type="number" value={form.auto_liability ?? ''} onChange={money('auto_liability')} />
            </Field>
            <Field label="Umbrella / Excess">
              <Input type="number" value={form.umbrella ?? ''} onChange={money('umbrella')} />
            </Field>
            <Field label="Employer's Liability">
              <Input type="number" value={form.employers_liability ?? ''} onChange={money('employers_liability')} />
            </Field>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {check('workers_comp', "Workers' Compensation (statutory)")}
            {check('property_required', 'Property / Special Form')}
            {check('waiver_of_subrogation', 'Waiver of Subrogation')}
            {check('primary_noncontributory', 'Primary & Non-Contributory')}
          </div>
        </Section>

        <Section title="Certificate Tracking">
          <div className="grid grid-cols-2 gap-3">
            <Field label="COI Status">
              <Select
                value={form.coi_status || ''}
                onChange={(e) => set('coi_status', e.target.value)}
              >
                <option value="">—</option>
                {COI_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="COI Received Date">
              <Input
                type="date"
                value={form.coi_received_date || ''}
                onChange={(e) => set('coi_received_date', e.target.value)}
              />
            </Field>
            <Field label="Policy Effective Date">
              <Input
                type="date"
                value={form.effective_date || ''}
                onChange={(e) => set('effective_date', e.target.value)}
              />
            </Field>
            <Field label="Policy Expiration Date">
              <Input
                type="date"
                value={form.expiration_date || ''}
                onChange={(e) => set('expiration_date', e.target.value)}
              />
            </Field>
            <Field label="Broker / Agent">
              <Input
                value={form.broker_name || ''}
                onChange={(e) => set('broker_name', e.target.value)}
              />
            </Field>
            <Field label="Broker Contact (email / phone)">
              <Input
                value={form.broker_contact || ''}
                onChange={(e) => set('broker_contact', e.target.value)}
              />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea
              rows={2}
              value={form.notes || ''}
              onChange={(e) => set('notes', e.target.value)}
            />
          </Field>
        </Section>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

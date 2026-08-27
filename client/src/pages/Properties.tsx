import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Property, Lease, Transaction } from '../lib/types';
import { num, usd, usdCompact, fmtDate } from '../lib/format';
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
import { SortGroupBar } from '../components/SortGroupBar';
import CustomFields, { CustomFieldsView } from '../components/CustomFields';
import ColumnPicker from '../components/ColumnPicker';
import AddressAutocomplete from '../components/AddressAutocomplete';
import ActivityLog from '../components/ActivityLog';
import { hasMapsKey, staticMapUrl } from '../lib/maps';
import { sortRows, groupRows, type SortDir, type SortOption, type GroupOption } from '../lib/table';
import { useColumns, type ColumnDef } from '../lib/columns';
import { customColumns } from '../lib/tableColumns';
import { getFieldDefs } from '../lib/fields';
import type { FieldDef } from '../lib/types';
import { COUNTRIES, statesFor, regionForCountry, REGIONS } from '../lib/geo';

const PROPERTY_TYPES = [
  'Headquarters',
  'Research and Development',
  'NOP Hub',
  'Multi-Use',
  'Aviation',
];
const STATUSES = ['Active', 'Under Review', 'Disposed'];
const OWNERSHIP_TYPES = ['Leased', 'Owned', 'Condo'];

const SORTS: SortOption<Property>[] = [
  { key: 'name', label: 'Name', get: (p) => p.name || '' },
  { key: 'location', label: 'Location', get: (p) => `${p.state || ''} ${p.city || ''}` },
  { key: 'region', label: 'Region', get: (p) => regionForCountry(p.country) },
  { key: 'property_type', label: 'Type', get: (p) => p.property_type || '' },
  { key: 'ownership', label: 'Ownership', get: (p) => p.ownership || '' },
  { key: 'rentable_sqft', label: 'Rentable SF', get: (p) => p.rentable_sqft || 0 },
  { key: 'status', label: 'Status', get: (p) => p.status || '' },
];
const GROUPS: GroupOption<Property>[] = [
  { key: 'none', label: 'None', get: () => '' },
  {
    key: 'region',
    label: 'Region',
    get: (p) => regionForCountry(p.country),
    order: [...REGIONS, 'Other'],
  },
  { key: 'property_type', label: 'Type', get: (p) => p.property_type || '—' },
  { key: 'ownership', label: 'Ownership', get: (p) => p.ownership || '—' },
  { key: 'state', label: 'State', get: (p) => p.state || '—' },
  { key: 'country', label: 'Country', get: (p) => p.country || '—' },
  { key: 'status', label: 'Status', get: (p) => p.status || '—' },
];

const EMPTY: Partial<Property> = {
  name: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  country: 'USA',
  lat: 39.5,
  lng: -98.35,
  property_type: 'NOP Hub',
  rentable_sqft: 0,
  status: 'Active',
  ownership: 'Leased',
  agile_office: false,
};

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Property> | null>(null);
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [groupKey, setGroupKey] = useState('none');
  const [search, setSearch] = useState('');

  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggleExpand = (id: number) =>
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  // Deep-link from a transaction: auto-expand a property's leases (?expand=).
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const id = searchParams.get('expand');
    if (!id) return;
    setExpanded((s) => new Set(s).add(Number(id)));
    const next = new URLSearchParams(searchParams);
    next.delete('expand');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // All leases assigned to each property (a property may have many).
  const leasesByProperty = useMemo(() => {
    const m = new Map<number, Lease[]>();
    for (const l of leases) {
      if (!m.has(l.property_id)) m.set(l.property_id, []);
      m.get(l.property_id)!.push(l);
    }
    return m;
  }, [leases]);

  // Transactions related to each property.
  const txnsByProperty = useMemo(() => {
    const m = new Map<number, Transaction[]>();
    for (const t of transactions) {
      if (t.property_id == null) continue;
      if (!m.has(t.property_id)) m.set(t.property_id, []);
      m.get(t.property_id)!.push(t);
    }
    return m;
  }, [transactions]);

  // Annual rent per property = sum of its active leases' base rent.
  const rentByProperty = useMemo(() => {
    const m = new Map<number, number>();
    for (const l of leases) {
      if (l.status !== 'Active') continue;
      m.set(l.property_id, (m.get(l.property_id) || 0) + (l.base_rent_annual || 0));
    }
    return m;
  }, [leases]);

  // Soonest lease expiration per property (earliest expiration among its leases).
  const nextExpByProperty = useMemo(() => {
    const m = new Map<number, string>();
    for (const [pid, ls] of leasesByProperty) {
      const dates = ls.map((l) => l.expiration_date).filter(Boolean).sort();
      if (dates.length) m.set(pid, dates[0]);
    }
    return m;
  }, [leasesByProperty]);

  const filteredProperties = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter((p) =>
      [p.name, p.address, p.city, p.state, p.country, p.property_type, p.ownership, p.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [properties, search]);

  const groups = useMemo(() => {
    const sorted = sortRows(filteredProperties, SORTS.find((s) => s.key === sortKey), sortDir);
    const groupOpt = groupKey === 'none' ? undefined : GROUPS.find((g) => g.key === groupKey);
    return groupRows(sorted, groupOpt);
  }, [filteredProperties, sortKey, sortDir, groupKey]);

  // ---- Dynamic columns ----
  const [propDefs, setPropDefs] = useState<FieldDef[]>([]);
  useEffect(() => {
    getFieldDefs('property').then(setPropDefs);
  }, []);

  const allColumns = useMemo<ColumnDef<Property>[]>(() => {
    const base: ColumnDef<Property>[] = [
      {
        key: 'location',
        label: 'Location',
        group: 'This tab',
        render: (p) => (
          <>
            {p.city}, {p.state}
            <div className="text-xs text-slate-400">{p.country}</div>
          </>
        ),
      },
      {
        key: 'region',
        label: 'Region',
        group: 'This tab',
        render: (p) => regionForCountry(p.country),
      },
      {
        key: 'type',
        label: 'Type',
        group: 'This tab',
        render: (p) => (
          <div className="flex flex-wrap items-center gap-1">
            <Badge>{p.property_type}</Badge>
            {p.agile_office && (
              <span className="rounded-full bg-[#44546A]/10 px-2 py-0.5 text-xs font-medium text-[#44546A]">
                Agile
              </span>
            )}
          </div>
        ),
      },
      { key: 'ownership', label: 'Ownership', group: 'This tab', render: (p) => p.ownership },
      {
        key: 'rentable_sqft',
        label: 'Rentable SF',
        group: 'This tab',
        align: 'right',
        render: (p) => <span className="tabular-nums">{num(p.rentable_sqft)}</span>,
        sum: (p) => p.rentable_sqft || 0,
        fmtSum: (n) => num(n),
      },
      {
        key: 'annual_rent',
        label: 'Annual Rent',
        group: 'From Leases',
        align: 'right',
        render: (p) => (
          <span className="tabular-nums">
            {rentByProperty.get(p.id) ? usdCompact(rentByProperty.get(p.id)!) : '—'}
          </span>
        ),
        sum: (p) => rentByProperty.get(p.id) || 0,
        fmtSum: (n) => usd(n),
      },
      {
        key: 'lease_exp',
        label: 'Lease Exp.',
        group: 'From Leases',
        render: (p) => {
          const exp = p.lease_expiration || nextExpByProperty.get(p.id);
          return exp ? fmtDate(exp) : '—';
        },
      },
      { key: 'status', label: 'Status', group: 'This tab', render: (p) => <Badge>{p.status}</Badge> },
      // Available but hidden by default:
      { key: 'address', label: 'Address', group: 'This tab', defaultVisible: false, render: (p) => p.address || '—' },
      { key: 'zip', label: 'Zip', group: 'This tab', defaultVisible: false, render: (p) => p.zip || '—' },
      {
        key: 'agile',
        label: 'Agile Office',
        group: 'This tab',
        defaultVisible: false,
        render: (p) => (p.agile_office ? 'Yes' : 'No'),
      },
      {
        key: 'lease_count',
        label: 'Lease Count',
        group: 'From Leases',
        align: 'right',
        defaultVisible: false,
        render: (p) => <span className="tabular-nums">{(leasesByProperty.get(p.id) || []).length}</span>,
      },
    ];
    return [...base, ...customColumns<Property>(propDefs, 'Custom fields', (p) => p.custom)];
  }, [rentByProperty, nextExpByProperty, leasesByProperty, propDefs]);

  const { keys: colKeys, setKeys: setColKeys, reset: resetCols, columns } = useColumns(
    'property',
    allColumns,
  );
  const colCount = columns.length + 2; // identity (Name) + actions
  const sumCol = (c: ColumnDef<Property>, rows: Property[]): React.ReactNode =>
    c.sum ? (c.fmtSum ?? num)(rows.reduce((s, p) => s + c.sum!(p), 0)) : '';

  const load = () =>
    Promise.all([api.properties(), api.leases(), api.transactions()]).then(([p, l, t]) => {
      setProperties(p);
      setLeases(l);
      setTransactions(t);
      setLoading(false);
    });

  useEffect(() => {
    load();
  }, []);

  async function save(form: Partial<Property>) {
    if (form.id) await api.updateProperty(form.id, form);
    else await api.createProperty(form);
    setEditing(null);
    load();
  }

  async function remove(id: number) {
    if (!confirm('Delete this property and its leases?')) return;
    await api.deleteProperty(id);
    load();
  }

  if (loading) return <Spinner />;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Properties</h1>
          <p className="text-sm text-slate-500">
            {search
              ? `${filteredProperties.length} of ${properties.length} sites`
              : `${properties.length} sites in the portfolio`}
          </p>
        </div>
        <Button onClick={() => setEditing(EMPTY)}>+ Add Property</Button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="flex items-center gap-2">
          <ColumnPicker all={allColumns} visible={colKeys} onChange={setColKeys} onReset={resetCols} />
          <div className="sm:w-64">
            <Input
              type="search"
              placeholder="Filter by name, city, state, type…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Card className="overflow-x-auto scroll-touch">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Name</th>
              {columns.map((c) => (
                <th key={c.key} className={`px-5 py-3 ${c.align === 'right' ? 'text-right' : ''}`}>
                  {c.label}
                </th>
              ))}
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.key || 'all'}>
                {groupKey !== 'none' && (
                  <tr className="bg-slate-50/70">
                    <td
                      colSpan={colCount}
                      className="px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {g.key} <span className="text-slate-400">· {g.rows.length}</span>
                    </td>
                  </tr>
                )}
                {g.rows.map((p) => {
                  const plist = leasesByProperty.get(p.id) || [];
                  const isOpen = expanded.has(p.id);
                  return (
                    <Fragment key={p.id}>
                      <tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <button
                            onClick={() => toggleExpand(p.id)}
                            className="flex items-start gap-1.5 text-left"
                            title={isOpen ? 'Hide leases' : 'Show leases'}
                          >
                            <span className="mt-0.5 w-3 text-xs text-slate-400">
                              {isOpen ? '▾' : '▸'}
                            </span>
                            <span>
                              <span className="font-medium text-slate-800">{p.name}</span>
                              <span className="block text-xs text-slate-400">
                                {plist.length} lease{plist.length === 1 ? '' : 's'}
                              </span>
                            </span>
                          </button>
                        </td>
                        {columns.map((c) => (
                          <td
                            key={c.key}
                            className={`px-5 py-3 text-slate-600 ${c.align === 'right' ? 'text-right' : ''}`}
                          >
                            {c.render(p)}
                          </td>
                        ))}
                        <td className="px-5 py-3 text-right">
                          <button
                            className="mr-3 text-xs font-medium text-blue-600 hover:underline"
                            onClick={() => setEditing(p)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-xs font-medium text-rose-600 hover:underline"
                            onClick={() => remove(p.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <td colSpan={colCount} className="px-5 py-3">
                            <PropertyLeases
                              leases={plist}
                              transactions={txnsByProperty.get(p.id) || []}
                              onAdd={() => navigate(`/leases?addForProperty=${p.id}`)}
                              onOpenTxn={(id) => navigate(`/transactions?open=${id}`)}
                            />
                            <PropertyCustomView property={p} />
                            <PropertyStaticMap property={p} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {groupKey !== 'none' && (
                  <tr className="border-b border-slate-200 bg-slate-50/40 text-slate-600">
                    <td className="px-5 py-2 text-xs font-medium">
                      {g.key} subtotal · {g.rows.length}
                    </td>
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={`px-5 py-2 text-xs font-semibold tabular-nums ${
                          c.align === 'right' ? 'text-right' : ''
                        }`}
                      >
                        {sumCol(c, g.rows)}
                      </td>
                    ))}
                    <td></td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold text-slate-800">
              <td className="px-5 py-3">
                Total · {num(filteredProperties.length)} properties
              </td>
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-5 py-3 tabular-nums ${c.align === 'right' ? 'text-right' : ''}`}
                >
                  {sumCol(c, filteredProperties)}
                </td>
              ))}
              <td></td>
            </tr>
          </tfoot>
        </table>
      </Card>

      {editing && (
        <PropertyForm
          initial={editing}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// Inline list of all leases assigned to a property, with a shortcut to add
// another, plus any related transactions. A property can hold any number of leases.
function PropertyLeases({
  leases,
  transactions,
  onAdd,
  onOpenTxn,
}: {
  leases: Lease[];
  transactions: Transaction[];
  onAdd: () => void;
  onOpenTxn: (id: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Leases on this property ({leases.length})
        </div>
        <Button onClick={onAdd}>+ Add lease to this property</Button>
      </div>
      {leases.length === 0 ? (
        <p className="text-sm text-slate-500">
          No leases assigned yet. Use “Add lease to this property” to create one.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2">Lease</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Sq Ft</th>
                <th className="px-4 py-2 text-right">Base Rent/yr</th>
                <th className="px-4 py-2">Expiration</th>
              </tr>
            </thead>
            <tbody>
              {leases.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 font-medium text-slate-800">{l.lease_name}</td>
                  <td className="px-4 py-2">
                    <Badge>{l.status}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-700">
                    {num(l.rentable_sqft || 0)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-700">
                    {l.base_rent_annual ? usdCompact(l.base_rent_annual) : '—'}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{fmtDate(l.expiration_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Related transactions ({transactions.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {transactions.map((t) => (
              <button
                key={t.id}
                onClick={() => onOpenTxn(t.id)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:border-blue-300 hover:text-blue-600"
                title={`${t.type} · ${t.stage}`}
              >
                ⇄ {t.name} <span className="text-slate-400">· {t.stage}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PropertyStaticMap({ property }: { property: Property }) {
  const lat = Number(property.lat);
  const lng = Number(property.lng);
  const ok =
    hasMapsKey() && Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
  if (!ok) return null;
  const url = staticMapUrl(lat, lng, { w: 440, h: 200 });
  if (!url) return null;
  return (
    <div className="mt-3">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Location
      </div>
      <img
        src={url}
        alt={`Map of ${property.name}`}
        width={440}
        height={200}
        loading="lazy"
        className="max-w-full rounded-lg border border-slate-200"
      />
    </div>
  );
}

function PropertyCustomView({ property }: { property: Property }) {
  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
      <CustomFieldsView entity="property" value={property.custom} />
    </dl>
  );
}

function PropertyForm({
  initial,
  onSave,
  onClose,
}: {
  initial: Partial<Property>;
  onSave: (p: Partial<Property>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Property>>(initial);
  const set = (k: keyof Property, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  // Fill fields from a chosen Google Places address (skips empty values).
  const applyPlace = (fields: Partial<Property>) =>
    setForm((f) => {
      const next = { ...f };
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== '') (next as Record<string, unknown>)[k] = v;
      }
      return next;
    });

  return (
    <Modal title={form.id ? 'Edit Property' : 'Add Property'} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <Field label="Property Name">
          <Input value={form.name || ''} onChange={(e) => set('name', e.target.value)} required />
        </Field>
        <Field label="Address">
          <AddressAutocomplete
            value={form.address || ''}
            onChange={(v) => set('address', v)}
            onPick={applyPlace}
          />
          {hasMapsKey() && (
            <span className="mt-1 block text-xs text-slate-400">
              Start typing and pick a suggestion to auto-fill city, state, zip, country &
              coordinates.
            </span>
          )}
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="City">
            <Input value={form.city || ''} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <Field label={statesFor(form.country) ? 'State / Region' : 'State / Region'}>
            {statesFor(form.country) ? (
              <Select value={form.state || ''} onChange={(e) => set('state', e.target.value)}>
                <option value="">—</option>
                {form.state && !statesFor(form.country)!.includes(form.state) && (
                  <option value={form.state}>{form.state}</option>
                )}
                {statesFor(form.country)!.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            ) : (
              <Input value={form.state || ''} onChange={(e) => set('state', e.target.value)} />
            )}
          </Field>
          <Field label="Zip">
            <Input value={form.zip || ''} onChange={(e) => set('zip', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude">
            <Input
              type="number"
              step="any"
              value={form.lat ?? ''}
              onChange={(e) => set('lat', parseFloat(e.target.value))}
            />
          </Field>
          <Field label="Longitude">
            <Input
              type="number"
              step="any"
              value={form.lng ?? ''}
              onChange={(e) => set('lng', parseFloat(e.target.value))}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Property Type">
            <Select
              value={form.property_type}
              onChange={(e) => set('property_type', e.target.value)}
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Rentable Sq Ft">
            <Input
              type="number"
              value={form.rentable_sqft ?? 0}
              onChange={(e) => set('rentable_sqft', parseInt(e.target.value || '0'))}
            />
          </Field>
        </div>
        <Field label="Lease Expiration">
          <Input
            type="date"
            value={form.lease_expiration || ''}
            onChange={(e) => set('lease_expiration', e.target.value)}
          />
          <span className="mt-1 block text-xs text-slate-400">
            Auto-set to the connected lease's expiration when you add/extend a lease on this
            property; you can also override it here.
          </span>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Country">
            <Select
              value={form.country || ''}
              onChange={(e) => {
                const c = e.target.value;
                setForm((f) => {
                  const opts = statesFor(c);
                  const keep = !opts || (!!f.state && opts.includes(f.state));
                  return { ...f, country: c, state: keep ? f.state : '' };
                });
              }}
            >
              <option value="">—</option>
              {form.country && !COUNTRIES.includes(form.country) && (
                <option value={form.country}>{form.country}</option>
              )}
              {COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            <span className="mt-1 block text-xs text-slate-400">
              Region: {regionForCountry(form.country)}
            </span>
          </Field>
          <Field label="Ownership">
            <Select value={form.ownership} onChange={(e) => set('ownership', e.target.value)}>
              {OWNERSHIP_TYPES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
        </div>
        <label className="flex items-center gap-2 pt-1 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={!!form.agile_office}
            onChange={(e) => set('agile_office', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          Agile office space (e.g. Regus / WeWork)
        </label>
        <div className="grid grid-cols-2 gap-3">
          <CustomFields
            entity="property"
            value={form.custom}
            onChange={(c) => set('custom', c)}
          />
        </div>
        <ActivityLog
          entries={form.note_log || []}
          onChange={(entries) => set('note_log', entries)}
          persist={
            form.id
              ? (entries) => api.updateProperty(form.id as number, { note_log: entries }).then(() => {})
              : undefined
          }
        />
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

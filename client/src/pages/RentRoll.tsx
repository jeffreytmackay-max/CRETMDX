import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { Property, Lease, FieldDef } from '../lib/types';
import { currentLeases } from '../lib/reports';
import { leaseCommitment } from '../lib/finance';
import { regionForCountry } from '../lib/geo';
import { usd, num, pct, fmtDate, monthsUntil } from '../lib/format';
import { downloadWorkbook, type Sheet } from '../lib/excel';
import { usePersisted } from '../lib/uiState';
import { Badge, Button, Card, Input, Select, Spinner } from '../components/ui';
import { Monogram } from '../components/Logo';
import ColumnPicker from '../components/ColumnPicker';
import FilterBar, { applyFilters, type FilterDef } from '../components/FilterBar';
import { useColumns, type ColumnDef } from '../lib/columns';
import { customColumns } from '../lib/tableColumns';
import { getFieldDefs } from '../lib/fields';

// A dedicated, property-centric rent roll: one row per property joined to its
// current (active/superseding) lease, with a column chooser, filter bar, group
// subtotals, totals, and Excel/print export — matching the other tabs.

interface RentRollRow {
  property: Property;
  lease?: Lease;
  region: string;
  sqft: number;
  annual: number;
  rentPsf: number;
  opexPsf: number;
  commitTotal: number;
  commitRemaining: number;
}

function termLeft(exp?: string): string {
  const m = monthsUntil(exp);
  if (!Number.isFinite(m)) return '—';
  if (m < 0) return 'Expired';
  if (m < 12) return `${m} mo`;
  const y = Math.floor(m / 12);
  const r = m % 12;
  return r ? `${y}y ${r}m` : `${y}y`;
}

const selectFilters = <Row,>(defs: FieldDef[], get: (row: Row, key: string) => string): FilterDef<Row>[] =>
  defs
    .filter((d) => d.field_type === 'select')
    .map((d) => ({
      key: `cf:${d.entity}:${d.field_key}`,
      label: d.label,
      options: (d.options || '').split(',').map((o) => o.trim()).filter(Boolean),
      get: (row: Row) => get(row, d.field_key),
    }));

export default function RentRoll() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [propDefs, setPropDefs] = useState<FieldDef[]>([]);
  const [leaseDefs, setLeaseDefs] = useState<FieldDef[]>([]);

  const [group, setGroup] = usePersisted<'none' | 'region' | 'state'>('cretmdx:rr:group', 'none');
  const [includeVacant, setIncludeVacant] = usePersisted('cretmdx:rr:vacant', false);
  const [search, setSearch] = usePersisted('cretmdx:rr:search', '');
  const [filters, setFilters] = usePersisted<Record<string, string[]>>('cretmdx:rr:filters', {});

  useEffect(() => {
    Promise.all([api.properties(), api.leases()]).then(([p, l]) => {
      setProperties(p);
      setLeases(l);
      setLoading(false);
    });
    getFieldDefs('property').then(setPropDefs);
    getFieldDefs('lease').then(setLeaseDefs);
  }, []);

  // Each property's current (active/superseding) lease.
  const currentByProperty = useMemo(() => {
    const m = new Map<number, Lease>();
    for (const l of currentLeases(leases)) if (l.property_id != null) m.set(l.property_id, l);
    return m;
  }, [leases]);

  // One row per property joined to its current lease (before filters).
  const baseRows = useMemo<RentRollRow[]>(() => {
    const out: RentRollRow[] = [];
    for (const p of properties) {
      const lease = currentByProperty.get(p.id);
      if (!lease && !includeVacant) continue;
      const sqft = lease?.rentable_sqft || p.rentable_sqft || 0;
      const annual = lease?.base_rent_annual || 0;
      const commit = lease ? leaseCommitment(lease) : { total: 0, remaining: 0 };
      out.push({
        property: p,
        lease,
        region: regionForCountry(p.country),
        sqft,
        annual,
        rentPsf: sqft ? annual / sqft : 0,
        opexPsf: lease?.opex_psf || 0,
        commitTotal: commit.total,
        commitRemaining: commit.remaining,
      });
    }
    return out;
  }, [properties, currentByProperty, includeVacant]);

  const distinct = (vals: (string | undefined)[]) =>
    Array.from(new Set(vals.filter((v): v is string => !!v))).sort();

  const filterDefs = useMemo<FilterDef<RentRollRow>[]>(() => {
    const base: FilterDef<RentRollRow>[] = [
      { key: 'region', label: 'Region', options: distinct(baseRows.map((r) => r.region)), get: (r) => r.region },
      { key: 'status', label: 'Status', options: distinct(baseRows.map((r) => r.lease?.status || 'Vacant')), get: (r) => r.lease?.status || 'Vacant' },
      { key: 'ptype', label: 'Property Type', options: distinct(baseRows.map((r) => r.property.property_type)), get: (r) => r.property.property_type },
      { key: 'ownership', label: 'Ownership', options: distinct(baseRows.map((r) => r.property.ownership)), get: (r) => r.property.ownership },
      { key: 'ltype', label: 'Lease Type', options: distinct(baseRows.map((r) => r.lease?.lease_type)), get: (r) => r.lease?.lease_type || '' },
      { key: 'btype', label: 'Building Type', options: distinct(baseRows.map((r) => r.lease?.building_type)), get: (r) => r.lease?.building_type || '' },
    ];
    const propCustom = selectFilters<RentRollRow>(propDefs, (r, k) => String(r.property.custom?.[k] ?? '') || '');
    const leaseCustom = selectFilters<RentRollRow>(leaseDefs, (r, k) => String(r.lease?.custom?.[k] ?? '') || '');
    return [...base, ...propCustom, ...leaseCustom];
  }, [baseRows, propDefs, leaseDefs]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rs = applyFilters(baseRows, filterDefs, filters);
    if (q) {
      rs = rs.filter((r) =>
        [r.property.name, r.property.city, r.property.state, r.lease?.counterparty, r.lease?.lease_name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }
    return [...rs].sort((a, b) => a.property.name.localeCompare(b.property.name));
  }, [baseRows, filterDefs, filters, search]);

  const allColumns = useMemo<ColumnDef<RentRollRow>[]>(() => {
    const native: ColumnDef<RentRollRow>[] = [
      { key: 'landlord', label: 'Landlord', group: 'Lease', render: (r) => r.lease?.counterparty || <span className="text-slate-400">Vacant</span>, text: (r) => r.lease?.counterparty || '' },
      { key: 'ltype', label: 'Type', group: 'Lease', render: (r) => r.lease?.lease_type || '—', text: (r) => r.lease?.lease_type || '' },
      { key: 'status', label: 'Status', group: 'Lease', render: (r) => (r.lease ? <Badge>{r.lease.status}</Badge> : <span className="text-slate-400">Vacant</span>), text: (r) => r.lease?.status || 'Vacant' },
      { key: 'sqft', label: 'Rentable SF', group: 'Lease', align: 'right', render: (r) => <span className="tabular-nums">{r.sqft ? num(r.sqft) : '—'}</span>, text: (r) => String(r.sqft || ''), sum: (r) => r.sqft, fmtSum: (n) => num(n) },
      { key: 'annual', label: 'Base Rent/yr', group: 'Lease', align: 'right', render: (r) => <span className="tabular-nums">{r.annual ? usd(r.annual) : '—'}</span>, text: (r) => String(Math.round(r.annual) || ''), sum: (r) => r.annual, fmtSum: (n) => usd(n) },
      { key: 'commit_total', label: 'Total Commitment', group: 'Lease', align: 'right', render: (r) => <span className="tabular-nums">{r.commitTotal ? usd(r.commitTotal) : '—'}</span>, text: (r) => String(Math.round(r.commitTotal) || ''), sum: (r) => r.commitTotal, fmtSum: (n) => usd(n) },
      { key: 'commit_remaining', label: 'Remaining Commitment', group: 'Lease', align: 'right', render: (r) => <span className="tabular-nums">{r.commitRemaining ? usd(r.commitRemaining) : '—'}</span>, text: (r) => String(Math.round(r.commitRemaining) || ''), sum: (r) => r.commitRemaining, fmtSum: (n) => usd(n) },
      { key: 'rentpsf', label: 'Rent/SF', group: 'Lease', align: 'right', render: (r) => <span className="tabular-nums">{r.rentPsf ? usd(r.rentPsf, 2) : '—'}</span>, text: (r) => (r.rentPsf ? r.rentPsf.toFixed(2) : '') },
      { key: 'opexpsf', label: 'OpEx/SF', group: 'Lease', align: 'right', render: (r) => <span className="tabular-nums">{r.opexPsf ? usd(r.opexPsf, 2) : '—'}</span>, text: (r) => (r.opexPsf ? String(r.opexPsf) : '') },
      { key: 'commence', label: 'Commence', group: 'Lease', render: (r) => fmtDate(r.lease?.commencement_date), text: (r) => r.lease?.commencement_date || '' },
      { key: 'expiration', label: 'Expiration', group: 'Lease', render: (r) => fmtDate(r.lease?.expiration_date), text: (r) => r.lease?.expiration_date || '' },
      { key: 'termleft', label: 'Term Left', group: 'Lease', render: (r) => termLeft(r.lease?.expiration_date), text: (r) => termLeft(r.lease?.expiration_date) },
      // Available but hidden by default:
      { key: 'lease_name', label: 'Lease Name', group: 'Lease', defaultVisible: false, render: (r) => r.lease?.lease_name || '—', text: (r) => r.lease?.lease_name || '' },
      { key: 'escalation', label: 'Escalation %', group: 'Lease', align: 'right', defaultVisible: false, render: (r) => (r.lease?.escalation_pct ? pct(r.lease.escalation_pct) : '—'), text: (r) => (r.lease?.escalation_pct ? String(r.lease.escalation_pct) : '') },
      { key: 'renewal', label: 'Renewal Options', group: 'Lease', defaultVisible: false, render: (r) => r.lease?.renewal_options || '—', text: (r) => r.lease?.renewal_options || '' },
      { key: 'building_type', label: 'Building Type', group: 'Lease', defaultVisible: false, render: (r) => r.lease?.building_type || '—', text: (r) => r.lease?.building_type || '' },
      { key: 'currency', label: 'Currency', group: 'Lease', defaultVisible: false, render: (r) => r.lease?.currency || '—', text: (r) => r.lease?.currency || '' },
      { key: 'security_deposit', label: 'Security Deposit', group: 'Lease', align: 'right', defaultVisible: false, render: (r) => (r.lease?.security_deposit ? usd(r.lease.security_deposit) : '—'), text: (r) => String(r.lease?.security_deposit || '') },
      // Property fields:
      { key: 'city', label: 'City', group: 'Property', defaultVisible: false, render: (r) => r.property.city || '—', text: (r) => r.property.city || '' },
      { key: 'state', label: 'State', group: 'Property', defaultVisible: false, render: (r) => r.property.state || '—', text: (r) => r.property.state || '' },
      { key: 'country', label: 'Country', group: 'Property', defaultVisible: false, render: (r) => r.property.country || '—', text: (r) => r.property.country || '' },
      { key: 'region', label: 'Region', group: 'Property', defaultVisible: false, render: (r) => r.region || '—', text: (r) => r.region || '' },
      { key: 'ptype', label: 'Property Type', group: 'Property', defaultVisible: false, render: (r) => r.property.property_type || '—', text: (r) => r.property.property_type || '' },
      { key: 'ownership', label: 'Ownership', group: 'Property', defaultVisible: false, render: (r) => r.property.ownership || '—', text: (r) => r.property.ownership || '' },
      { key: 'prop_status', label: 'Property Status', group: 'Property', defaultVisible: false, render: (r) => r.property.status || '—', text: (r) => r.property.status || '' },
    ];
    return [
      ...native,
      ...customColumns<RentRollRow>(propDefs, 'Property custom', (r) => r.property.custom),
      ...customColumns<RentRollRow>(leaseDefs, 'Lease custom', (r) => r.lease?.custom),
    ];
  }, [propDefs, leaseDefs]);

  const { keys: colKeys, setKeys: setColKeys, reset: resetCols, columns } = useColumns('rentroll', allColumns);
  const colCount = columns.length + 1; // identity column + value columns

  const sumCol = (c: ColumnDef<RentRollRow>, rs: RentRollRow[]) =>
    c.sum ? (c.fmtSum ?? num)(rs.reduce((s, r) => s + c.sum!(r), 0)) : '';

  const totals = useMemo(() => {
    const sqft = rows.reduce((s, r) => s + r.sqft, 0);
    const annual = rows.reduce((s, r) => s + r.annual, 0);
    return { count: rows.length, sqft, annual, rentPsf: sqft ? annual / sqft : 0 };
  }, [rows]);

  const groups = useMemo(() => {
    if (group === 'none') return [{ key: '', rows }];
    const key = (r: RentRollRow) => (group === 'region' ? r.region : r.property.state || '—');
    const m = new Map<string, RentRollRow[]>();
    for (const r of rows) {
      const k = key(r);
      (m.get(k) || m.set(k, []).get(k)!).push(r);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, rs]) => ({ key: k, rows: rs }));
  }, [rows, group]);

  function exportXls() {
    const sheet: Sheet = {
      name: 'Rent Roll',
      headers: ['Property', ...columns.map((c) => c.label)],
      rows: rows.map((r) => [r.property.name, ...columns.map((c) => (c.text ? c.text(r) : ''))]),
    };
    downloadWorkbook(`transmedics-rent-roll-${new Date().toISOString().slice(0, 10)}.xls`, [sheet]);
  }

  if (loading) return <Spinner />;

  return (
    <div className="p-4 md:p-8">
      {/* Print header */}
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
          <div className="text-base font-semibold text-[#9D2235]">Rent Roll</div>
          <div className="text-xs text-slate-500">Generated {fmtDate(new Date().toISOString())}</div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rent Roll</h1>
          <p className="text-sm text-slate-500">
            {totals.count} {includeVacant ? 'sites' : 'leased sites'} · {num(totals.sqft)} SF ·{' '}
            {usd(totals.annual)} annual base rent · {usd(totals.rentPsf, 2)}/SF avg
          </p>
        </div>
        <div className="no-print flex items-center gap-2">
          <Button variant="ghost" onClick={() => window.print()}>
            🖨 Print
          </Button>
          <Button onClick={exportXls}>⤓ Export Excel</Button>
        </div>
      </div>

      {/* Controls: column chooser + grouping + options + search */}
      <div className="no-print mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500">
        <ColumnPicker all={allColumns} visible={colKeys} onChange={setColKeys} onReset={resetCols} />
        <label className="flex items-center gap-1">
          Group by
          <div className="w-28">
            <Select value={group} onChange={(e) => setGroup(e.target.value as 'none' | 'region' | 'state')}>
              <option value="none">None</option>
              <option value="region">Region</option>
              <option value="state">State</option>
            </Select>
          </div>
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={includeVacant} onChange={(e) => setIncludeVacant(e.target.checked)} />
          Include vacant sites
        </label>
        <div className="ml-auto sm:w-64">
          <Input type="search" placeholder="Search property, landlord…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Filter bar — same as the other tabs */}
      <div className="no-print mb-4">
        <FilterBar defs={filterDefs} filters={filters} setFilters={setFilters} shown={rows.length} total={baseRows.length} />
      </div>

      <Card className="overflow-x-auto scroll-touch">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Property</th>
              {columns.map((c) => (
                <th key={c.key} className={`px-3 py-3 ${c.align === 'right' ? 'text-right' : ''}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.key || 'all'}>
                {group !== 'none' && (
                  <tr className="bg-slate-50/70">
                    <td colSpan={colCount} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {g.key} <span className="text-slate-400">· {g.rows.length}</span>
                    </td>
                  </tr>
                )}
                {g.rows.map((r) => (
                  <tr key={r.property.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => navigate(`/properties?expand=${r.property.id}`)}
                        className="text-left font-medium text-slate-800 hover:text-blue-600 hover:underline"
                      >
                        {r.property.name}
                      </button>
                      <div className="text-xs text-slate-400">
                        {[r.property.city, r.property.state].filter(Boolean).join(', ')}
                        {r.region ? ` · ${r.region}` : ''}
                      </div>
                    </td>
                    {columns.map((c) => (
                      <td key={c.key} className={`px-3 py-2.5 text-slate-600 ${c.align === 'right' ? 'text-right' : ''}`}>
                        {c.render(r)}
                      </td>
                    ))}
                  </tr>
                ))}
                {group !== 'none' && (
                  <tr className="border-b border-slate-200 bg-slate-50/40 text-xs font-medium text-slate-500">
                    <td className="px-3 py-1.5">{g.key} subtotal</td>
                    {columns.map((c) => (
                      <td key={c.key} className={`px-3 py-1.5 tabular-nums ${c.align === 'right' ? 'text-right' : ''}`}>
                        {sumCol(c, g.rows)}
                      </td>
                    ))}
                  </tr>
                )}
              </Fragment>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-3 py-8 text-center text-sm text-slate-400">
                  No matching sites.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold text-slate-800">
                <td className="px-3 py-3">Total · {totals.count} sites</td>
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 py-3 tabular-nums ${c.align === 'right' ? 'text-right' : ''}`}>
                    {sumCol(c, rows)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </Card>
    </div>
  );
}

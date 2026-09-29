import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { Property, Lease } from '../lib/types';
import { currentLeases } from '../lib/reports';
import { regionForCountry } from '../lib/geo';
import { usd, num, pct, fmtDate, monthsUntil } from '../lib/format';
import { downloadWorkbook, type Sheet } from '../lib/excel';
import { usePersisted } from '../lib/uiState';
import { Button, Card, Input, Select, Spinner } from '../components/ui';
import { Monogram } from '../components/Logo';

// A dedicated, property-centric rent roll: one row per property joined to its
// current (active/superseding) lease, with subtotals, grouping, filters, and
// Excel/print export.

interface RentRollRow {
  property: Property;
  lease?: Lease;
  region: string;
  sqft: number;
  annual: number;
  rentPsf: number;
  opexPsf: number;
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

export default function RentRoll() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);

  const [region, setRegion] = usePersisted('cretmdx:rr:region', 'All');
  const [status, setStatus] = usePersisted('cretmdx:rr:status', 'All');
  const [group, setGroup] = usePersisted<'none' | 'region' | 'state'>('cretmdx:rr:group', 'none');
  const [includeVacant, setIncludeVacant] = usePersisted('cretmdx:rr:vacant', false);
  const [search, setSearch] = usePersisted('cretmdx:rr:search', '');

  useEffect(() => {
    Promise.all([api.properties(), api.leases()]).then(([p, l]) => {
      setProperties(p);
      setLeases(l);
      setLoading(false);
    });
  }, []);

  // Each property's current lease.
  const currentByProperty = useMemo(() => {
    const m = new Map<number, Lease>();
    for (const l of currentLeases(leases)) if (l.property_id != null) m.set(l.property_id, l);
    return m;
  }, [leases]);

  const rows = useMemo<RentRollRow[]>(() => {
    const q = search.trim().toLowerCase();
    const out: RentRollRow[] = [];
    for (const p of properties) {
      const lease = currentByProperty.get(p.id);
      if (!lease && !includeVacant) continue;
      const rg = regionForCountry(p.country);
      if (region !== 'All' && rg !== region) continue;
      if (status !== 'All' && (lease?.status || 'Vacant') !== status) continue;
      if (q) {
        const hay = [p.name, p.city, p.state, lease?.counterparty, lease?.lease_name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) continue;
      }
      const sqft = lease?.rentable_sqft || p.rentable_sqft || 0;
      const annual = lease?.base_rent_annual || 0;
      out.push({
        property: p,
        lease,
        region: rg,
        sqft,
        annual,
        rentPsf: sqft ? annual / sqft : 0,
        opexPsf: lease?.opex_psf || 0,
      });
    }
    return out.sort((a, b) => a.property.name.localeCompare(b.property.name));
  }, [properties, currentByProperty, region, status, includeVacant, search]);

  const regionOptions = useMemo(
    () => Array.from(new Set(properties.map((p) => regionForCountry(p.country)))).sort(),
    [properties],
  );
  const statusOptions = useMemo(
    () => Array.from(new Set(leases.map((l) => l.status).filter(Boolean))).sort() as string[],
    [leases],
  );

  const totals = useMemo(() => {
    const sqft = rows.reduce((s, r) => s + r.sqft, 0);
    const annual = rows.reduce((s, r) => s + r.annual, 0);
    return { count: rows.length, sqft, annual, rentPsf: sqft ? annual / sqft : 0 };
  }, [rows]);

  // Grouped view.
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
      headers: [
        'Property', 'City', 'State', 'Region', 'Landlord', 'Lease', 'Type', 'Status',
        'Rentable SF', 'Base Rent/yr', 'Rent/SF', 'OpEx/SF', 'Commencement', 'Expiration',
        'Term Left', 'Escalation %', 'Renewal Options',
      ],
      rows: rows.map((r) => [
        r.property.name, r.property.city, r.property.state, r.region,
        r.lease?.counterparty || '', r.lease?.lease_name || '', r.lease?.lease_type || '',
        r.lease?.status || 'Vacant', r.sqft, Math.round(r.annual), Number(r.rentPsf.toFixed(2)),
        r.opexPsf, r.lease?.commencement_date || '', r.lease?.expiration_date || '',
        termLeft(r.lease?.expiration_date), r.lease?.escalation_pct || 0, r.lease?.renewal_options || '',
      ]),
    };
    downloadWorkbook(`transmedics-rent-roll-${new Date().toISOString().slice(0, 10)}.xls`, [sheet]);
  }

  if (loading) return <Spinner />;

  const colCount = 10;
  const subtotal = (rs: RentRollRow[]) => ({
    sqft: rs.reduce((s, r) => s + r.sqft, 0),
    annual: rs.reduce((s, r) => s + r.annual, 0),
  });

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

      {/* Controls */}
      <div className="no-print mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500">
        <label className="flex items-center gap-1">
          Region
          <div className="w-36">
            <Select value={region} onChange={(e) => setRegion(e.target.value)}>
              <option>All</option>
              {regionOptions.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          </div>
        </label>
        <label className="flex items-center gap-1">
          Status
          <div className="w-32">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>All</option>
              {statusOptions.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </div>
        </label>
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

      <Card className="overflow-x-auto scroll-touch">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Property</th>
              <th className="px-3 py-3">Landlord</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3 text-right">Rentable SF</th>
              <th className="px-3 py-3 text-right">Base Rent/yr</th>
              <th className="px-3 py-3 text-right">Rent/SF</th>
              <th className="px-3 py-3 text-right">OpEx/SF</th>
              <th className="px-3 py-3">Commence</th>
              <th className="px-3 py-3">Expiration</th>
              <th className="px-3 py-3">Term Left</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const st = subtotal(g.rows);
              return (
                <FragmentGroup
                  key={g.key || 'all'}
                  groupKey={group === 'none' ? '' : g.key}
                  rows={g.rows}
                  colCount={colCount}
                  subtotalSqft={st.sqft}
                  subtotalAnnual={st.annual}
                />
              );
            })}
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
                <td className="px-3 py-3" colSpan={3}>
                  Total · {totals.count} sites
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{num(totals.sqft)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{usd(totals.annual)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{usd(totals.rentPsf, 2)}</td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          )}
        </table>
      </Card>
    </div>
  );
}

function FragmentGroup({
  groupKey,
  rows,
  colCount,
  subtotalSqft,
  subtotalAnnual,
}: {
  groupKey: string;
  rows: RentRollRow[];
  colCount: number;
  subtotalSqft: number;
  subtotalAnnual: number;
}) {
  return (
    <>
      {groupKey && (
        <tr className="bg-slate-50/70">
          <td colSpan={colCount} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {groupKey} <span className="text-slate-400">· {rows.length}</span>
          </td>
        </tr>
      )}
      {rows.map((r) => (
        <tr key={r.property.id} className="border-b border-slate-100 hover:bg-slate-50">
          <td className="px-3 py-2.5">
            <div className="font-medium text-slate-800">{r.property.name}</div>
            <div className="text-xs text-slate-400">
              {[r.property.city, r.property.state].filter(Boolean).join(', ')}
              {r.region ? ` · ${r.region}` : ''}
            </div>
          </td>
          <td className="px-3 py-2.5 text-slate-600">
            {r.lease?.counterparty || <span className="text-slate-400">Vacant</span>}
          </td>
          <td className="px-3 py-2.5 text-slate-600">{r.lease?.lease_type || '—'}</td>
          <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{r.sqft ? num(r.sqft) : '—'}</td>
          <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{r.annual ? usd(r.annual) : '—'}</td>
          <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{r.rentPsf ? usd(r.rentPsf, 2) : '—'}</td>
          <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{r.opexPsf ? usd(r.opexPsf, 2) : '—'}</td>
          <td className="px-3 py-2.5 text-slate-600">{fmtDate(r.lease?.commencement_date)}</td>
          <td className="px-3 py-2.5 text-slate-600">{fmtDate(r.lease?.expiration_date)}</td>
          <td className="px-3 py-2.5 text-slate-600">{termLeft(r.lease?.expiration_date)}</td>
        </tr>
      ))}
      {groupKey && (
        <tr className="border-b border-slate-200 bg-slate-50/40 text-xs font-medium text-slate-500">
          <td className="px-3 py-1.5" colSpan={3}>
            {groupKey} subtotal
          </td>
          <td className="px-3 py-1.5 text-right tabular-nums">{num(subtotalSqft)}</td>
          <td className="px-3 py-1.5 text-right tabular-nums">{usd(subtotalAnnual)}</td>
          <td colSpan={5} />
        </tr>
      )}
    </>
  );
}

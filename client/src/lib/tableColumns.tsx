import type { ReactNode } from 'react';
import type { Property, Lease, FieldDef } from './types';
import type { ColumnDef } from './columns';
import { num, usdCompact, fmtDate } from './format';

// Reusable column builders for dynamic tables. These cover user-defined custom
// fields and fields pulled from a *related* record (a lease's property, a
// transaction's property/lease), so any table can surface fields that live on
// another tab.

function showCustom(v: unknown, type: FieldDef['field_type']): ReactNode {
  if (v === undefined || v === '' || v === null) return '—';
  if (type === 'checkbox') return v ? 'Yes' : 'No';
  if (type === 'date') return fmtDate(String(v));
  return String(v);
}

// Columns for a set of custom field definitions, reading from a custom map that
// may live on the row itself or on a related record.
export function customColumns<Row>(
  defs: FieldDef[],
  group: string,
  getCustom: (row: Row) => Record<string, unknown> | undefined,
): ColumnDef<Row>[] {
  return defs.map((d) => ({
    key: `${group}:custom:${d.field_key}`,
    label: d.label,
    group,
    defaultVisible: false,
    render: (row: Row) => showCustom(getCustom(row)?.[d.field_key], d.field_type),
  }));
}

// Fields pulled from the row's related Property.
export function propertyColumns<Row>(
  getProp: (row: Row) => Property | undefined,
  onOpen: ((id: number) => void) | undefined,
  propDefs: FieldDef[] = [],
  group = 'From Property',
): ColumnDef<Row>[] {
  const text = (fn: (p: Property) => ReactNode) => (row: Row) => {
    const p = getProp(row);
    return p ? fn(p) : '—';
  };
  const cols: ColumnDef<Row>[] = [
    {
      key: `${group}:name`,
      label: 'Property',
      group,
      defaultVisible: false,
      render: (row) => {
        const p = getProp(row);
        if (!p) return <span className="text-slate-400">—</span>;
        return onOpen ? (
          <button onClick={() => onOpen(p.id)} className="text-left text-blue-600 hover:underline">
            🏢 {p.name}
          </button>
        ) : (
          <>🏢 {p.name}</>
        );
      },
    },
    { key: `${group}:type`, label: 'Property Type', group, defaultVisible: false, render: text((p) => p.property_type) },
    { key: `${group}:city`, label: 'Property City', group, defaultVisible: false, render: text((p) => p.city) },
    { key: `${group}:state`, label: 'Property State', group, defaultVisible: false, render: text((p) => p.state) },
    { key: `${group}:country`, label: 'Property Country', group, defaultVisible: false, render: text((p) => p.country) },
    { key: `${group}:ownership`, label: 'Ownership', group, defaultVisible: false, render: text((p) => p.ownership) },
    { key: `${group}:status`, label: 'Property Status', group, defaultVisible: false, render: text((p) => p.status) },
    {
      key: `${group}:agile`,
      label: 'Agile Office',
      group,
      defaultVisible: false,
      render: text((p) => (p.agile_office ? 'Yes' : 'No')),
    },
    {
      key: `${group}:sqft`,
      label: 'Property SF',
      group,
      align: 'right',
      defaultVisible: false,
      render: text((p) => <span className="tabular-nums">{num(p.rentable_sqft || 0)}</span>),
    },
  ];
  return [...cols, ...customColumns<Row>(propDefs, group, (row) => getProp(row)?.custom)];
}

// Fields pulled from the row's related Lease.
export function leaseColumns<Row>(
  getLease: (row: Row) => Lease | undefined,
  onOpen: ((id: number) => void) | undefined,
  leaseDefs: FieldDef[] = [],
  group = 'From Lease',
): ColumnDef<Row>[] {
  const text = (fn: (l: Lease) => ReactNode) => (row: Row) => {
    const l = getLease(row);
    return l ? fn(l) : '—';
  };
  const cols: ColumnDef<Row>[] = [
    {
      key: `${group}:name`,
      label: 'Lease',
      group,
      defaultVisible: false,
      render: (row) => {
        const l = getLease(row);
        if (!l) return <span className="text-slate-400">—</span>;
        return onOpen ? (
          <button onClick={() => onOpen(l.id)} className="text-left text-blue-600 hover:underline">
            📄 {l.lease_name}
          </button>
        ) : (
          <>📄 {l.lease_name}</>
        );
      },
    },
    { key: `${group}:counterparty`, label: 'Counterparty', group, defaultVisible: false, render: text((l) => l.counterparty) },
    { key: `${group}:status`, label: 'Lease Status', group, defaultVisible: false, render: text((l) => l.status) },
    { key: `${group}:commencement`, label: 'Commencement', group, defaultVisible: false, render: text((l) => fmtDate(l.commencement_date)) },
    { key: `${group}:expiration`, label: 'Lease Expiration', group, defaultVisible: false, render: text((l) => fmtDate(l.expiration_date)) },
    {
      key: `${group}:rent`,
      label: 'Base Rent/yr',
      group,
      align: 'right',
      defaultVisible: false,
      render: text((l) => <span className="tabular-nums">{l.base_rent_annual ? usdCompact(l.base_rent_annual) : '—'}</span>),
    },
    {
      key: `${group}:sqft`,
      label: 'Lease SF',
      group,
      align: 'right',
      defaultVisible: false,
      render: text((l) => <span className="tabular-nums">{num(l.rentable_sqft || 0)}</span>),
    },
  ];
  return [...cols, ...customColumns<Row>(leaseDefs, group, (row) => getLease(row)?.custom)];
}

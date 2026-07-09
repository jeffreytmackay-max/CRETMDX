import type { Property, Lease, FieldDef } from './types';
import type { ColumnDef } from './columns';
import { num, usdCompact, fmtDate } from './format';

// Reusable column builders for dynamic tables. These cover user-defined custom
// fields and fields pulled from a *related* record (a lease's property, a
// transaction's property/lease), so any table can surface fields that live on
// another tab. Each column carries both a rich `render` and a plain `text`
// accessor (for CSV export / printing).

function showCustom(v: unknown, type: FieldDef['field_type']): string {
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
  return defs.map((d) => {
    const val = (row: Row) => showCustom(getCustom(row)?.[d.field_key], d.field_type);
    return {
      key: `${group}:custom:${d.field_key}`,
      label: d.label,
      group,
      defaultVisible: false,
      render: val,
      text: val,
    };
  });
}

// Fields pulled from the row's related Property.
export function propertyColumns<Row>(
  getProp: (row: Row) => Property | undefined,
  onOpen: ((id: number) => void) | undefined,
  propDefs: FieldDef[] = [],
  group = 'From Property',
): ColumnDef<Row>[] {
  // Build a text/render pair for a plain property field.
  const field = (key: string, label: string, get: (p: Property) => string, align?: 'right') => {
    const text = (row: Row) => {
      const p = getProp(row);
      return p ? get(p) : '—';
    };
    return { key: `${group}:${key}`, label, group, align, defaultVisible: false, render: text, text };
  };
  const cols: ColumnDef<Row>[] = [
    {
      key: `${group}:name`,
      label: 'Property',
      group,
      defaultVisible: false,
      text: (row) => getProp(row)?.name ?? '—',
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
    field('type', 'Property Type', (p) => p.property_type),
    field('city', 'Property City', (p) => p.city),
    field('state', 'Property State', (p) => p.state),
    field('country', 'Property Country', (p) => p.country),
    field('ownership', 'Ownership', (p) => p.ownership),
    field('status', 'Property Status', (p) => p.status),
    field('agile', 'Agile Office', (p) => (p.agile_office ? 'Yes' : 'No')),
    field('sqft', 'Property SF', (p) => num(p.rentable_sqft || 0), 'right'),
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
  const field = (key: string, label: string, get: (l: Lease) => string, align?: 'right') => {
    const text = (row: Row) => {
      const l = getLease(row);
      return l ? get(l) : '—';
    };
    return { key: `${group}:${key}`, label, group, align, defaultVisible: false, render: text, text };
  };
  const cols: ColumnDef<Row>[] = [
    {
      key: `${group}:name`,
      label: 'Lease',
      group,
      defaultVisible: false,
      text: (row) => getLease(row)?.lease_name ?? '—',
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
    field('counterparty', 'Counterparty', (l) => l.counterparty),
    field('status', 'Lease Status', (l) => l.status),
    field('commencement', 'Commencement', (l) => fmtDate(l.commencement_date)),
    field('expiration', 'Lease Expiration', (l) => fmtDate(l.expiration_date)),
    field('rent', 'Base Rent/yr', (l) => (l.base_rent_annual ? usdCompact(l.base_rent_annual) : '—'), 'right'),
    field('sqft', 'Lease SF', (l) => num(l.rentable_sqft || 0), 'right'),
  ];
  return [...cols, ...customColumns<Row>(leaseDefs, group, (row) => getLease(row)?.custom)];
}

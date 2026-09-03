import type { FieldDef } from '../lib/types';

// A dropdown-field filter definition: which field, its options, and how to read
// the value from a row.
export interface FilterDef<Row> {
  key: string;
  label: string;
  options: string[];
  get: (row: Row) => string | undefined;
}

// Build filter defs for a set of custom "select" fields on records that carry a
// `custom` map. Shared by every table.
export function customSelectFilters<Row extends { custom?: Record<string, unknown> }>(
  defs: FieldDef[],
): FilterDef<Row>[] {
  return defs
    .filter((d) => d.field_type === 'select')
    .map((d) => ({
      key: `custom:${d.field_key}`,
      label: d.label,
      options: (d.options || '').split(',').map((o) => o.trim()).filter(Boolean),
      get: (row: Row) => String((row.custom?.[d.field_key] ?? '') || ''),
    }));
}

// Keep only rows matching every active (non-"All") filter.
export function applyFilters<Row>(
  rows: Row[],
  defs: FilterDef<Row>[],
  filters: Record<string, string>,
): Row[] {
  return rows.filter((r) =>
    defs.every((fd) => {
      const sel = filters[fd.key];
      return !sel || sel === 'All' || String(fd.get(r) || '') === sel;
    }),
  );
}

export default function FilterBar<Row>({
  defs,
  filters,
  setFilters,
  shown,
  total,
}: {
  defs: FilterDef<Row>[];
  filters: Record<string, string>;
  setFilters: (v: Record<string, string> | ((p: Record<string, string>) => Record<string, string>)) => void;
  shown?: number;
  total?: number;
}) {
  const active = Object.values(filters).some((v) => v && v !== 'All');
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Filter</span>
      {defs.map((fd) => (
        <label key={fd.key} className="flex items-center gap-1 text-xs text-slate-500">
          {fd.label}
          <select
            value={filters[fd.key] || 'All'}
            onChange={(e) => setFilters((f) => ({ ...f, [fd.key]: e.target.value }))}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="All">All</option>
            {fd.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      ))}
      {active && (
        <button
          onClick={() => setFilters({})}
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          Reset filters
        </button>
      )}
      {shown != null && total != null && (
        <span className="ml-auto text-xs text-slate-400">
          {shown} of {total}
        </span>
      )}
    </div>
  );
}

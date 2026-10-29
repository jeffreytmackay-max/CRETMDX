import type { FieldDef } from '../lib/types';

// A filter-field definition: which field, its options, and how to read the
// value from a row. Selections are multi-select (checkboxes).
export interface FilterDef<Row> {
  key: string;
  label: string;
  options: string[];
  get: (row: Row) => string | undefined;
}

// Filter state: per field, the set of selected values. An empty/absent entry
// means "no filter on this field". Older saved state used a single string per
// field; `asArray` normalizes both shapes so nothing breaks on upgrade.
export type FilterState = Record<string, string[]>;

export function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  if (typeof v === 'string' && v && v !== 'All') return [v];
  return [];
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

// Keep only rows matching every active filter. Within a field, a row matches if
// its value is one of the checked options (OR); across fields it must match all
// active fields (AND).
export function applyFilters<Row>(
  rows: Row[],
  defs: FilterDef<Row>[],
  filters: Record<string, unknown>,
): Row[] {
  return rows.filter((r) =>
    defs.every((fd) => {
      const selected = asArray(filters[fd.key]);
      return selected.length === 0 || selected.includes(String(fd.get(r) || ''));
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
  filters: Record<string, unknown>;
  setFilters: (v: FilterState | ((p: FilterState) => FilterState)) => void;
  shown?: number;
  total?: number;
}) {
  const active = defs.some((fd) => asArray(filters[fd.key]).length > 0);

  const toggle = (key: string, opt: string) =>
    setFilters((f) => {
      const cur = asArray(f[key]);
      const next = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt];
      const out: FilterState = {};
      // normalize every field to an array and drop empties
      for (const d of defs) {
        const vals = d.key === key ? next : asArray(f[d.key]);
        if (vals.length) out[d.key] = vals;
      }
      return out;
    });

  const clearField = (key: string) =>
    setFilters((f) => {
      const out: FilterState = {};
      for (const d of defs) {
        if (d.key === key) continue;
        const vals = asArray(f[d.key]);
        if (vals.length) out[d.key] = vals;
      }
      return out;
    });

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Filter</span>
      {defs.map((fd) => {
        const sel = asArray(filters[fd.key]);
        return (
          <details key={fd.key} className="relative">
            <summary
              className={`flex cursor-pointer list-none items-center gap-1 rounded-lg border px-2.5 py-1 text-xs [&::-webkit-details-marker]:hidden ${
                sel.length
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {fd.label}
              {sel.length > 0 && (
                <span className="rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold text-white">
                  {sel.length}
                </span>
              )}
              <span className="text-slate-400">▾</span>
            </summary>
            <div className="absolute left-0 z-30 mt-1 max-h-64 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
              {fd.options.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-slate-400">No options</div>
              )}
              {fd.options.map((o) => (
                <label
                  key={o}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
                >
                  <input
                    type="checkbox"
                    checked={sel.includes(o)}
                    onChange={() => toggle(fd.key, o)}
                    className="h-3.5 w-3.5 rounded border-slate-300"
                  />
                  <span className="truncate">{o}</span>
                </label>
              ))}
              {sel.length > 0 && (
                <button
                  onClick={() => clearField(fd.key)}
                  className="mt-0.5 block w-full rounded-lg px-2 py-1 text-left text-xs font-medium text-blue-600 hover:bg-slate-100"
                >
                  Clear
                </button>
              )}
            </div>
          </details>
        );
      })}
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

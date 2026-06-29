// Small, reusable sorting + grouping helpers for record tables.

export type SortDir = 'asc' | 'desc';

export interface SortOption<T> {
  key: string;
  label: string;
  get: (row: T) => string | number;
}

export interface GroupOption<T> {
  key: string;
  label: string;
  get: (row: T) => string;
}

export interface Group<T> {
  key: string;
  rows: T[];
}

function compare(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true });
}

export function sortRows<T>(rows: T[], opt: SortOption<T> | undefined, dir: SortDir): T[] {
  if (!opt) return rows;
  const sorted = [...rows].sort((x, y) => compare(opt.get(x), opt.get(y)));
  return dir === 'desc' ? sorted.reverse() : sorted;
}

// Groups rows by the option's key. Group buckets are ordered alphabetically/numerically,
// with the blank bucket ("—") pushed to the end.
export function groupRows<T>(rows: T[], opt: GroupOption<T> | undefined): Group<T>[] {
  if (!opt) return [{ key: '', rows }];
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const k = opt.get(r) || '—';
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  }
  return [...map.entries()]
    .map(([key, rs]) => ({ key, rows: rs }))
    .sort((a, b) => {
      if (a.key === '—') return 1;
      if (b.key === '—') return -1;
      return a.key.localeCompare(b.key, undefined, { numeric: true });
    });
}

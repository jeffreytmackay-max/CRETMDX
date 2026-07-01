import type { ReactNode } from 'react';
import { useState } from 'react';

// Dynamic table columns. Each table (Properties / Leases / Transactions) keeps a
// fixed identity column and a fixed actions column; everything in between is a
// configurable column drawn from a registry. Columns can render the row's own
// fields, its user-defined custom fields, or fields looked up from a *related*
// record (e.g. a lease's property). The user's choice of which columns show and
// in what order is saved per table in localStorage.

export interface ColumnDef<Row> {
  key: string;
  label: string;
  group: string; // section shown in the column picker
  align?: 'left' | 'right';
  defaultVisible?: boolean; // false = available but hidden until added
  render: (row: Row) => ReactNode;
  // Numeric total for the Properties subtotal/footer rows. Columns without a
  // sum simply render blank in those rows.
  sum?: (row: Row) => number;
  fmtSum?: (n: number) => ReactNode;
}

const STORAGE_KEY = (entity: string) => `cretmdx:columns:${entity}`;

export function loadColumnPrefs(entity: string): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(entity));
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as string[]) : null;
  } catch {
    return null;
  }
}

export function saveColumnPrefs(entity: string, keys: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY(entity), JSON.stringify(keys));
  } catch {
    /* storage may be unavailable */
  }
}

export function resetColumnPrefs(entity: string): void {
  try {
    localStorage.removeItem(STORAGE_KEY(entity));
  } catch {
    /* ignore */
  }
}

export function defaultKeys<Row>(all: ColumnDef<Row>[]): string[] {
  return all.filter((c) => c.defaultVisible !== false).map((c) => c.key);
}

// Ordered, visible column defs for the current preference. Keys that no longer
// exist in the registry are dropped silently.
export function resolveColumns<Row>(all: ColumnDef<Row>[], visibleKeys: string[]): ColumnDef<Row>[] {
  const byKey = new Map(all.map((c) => [c.key, c]));
  return visibleKeys.map((k) => byKey.get(k)).filter(Boolean) as ColumnDef<Row>[];
}

// Column-preference state for one table. `all` may grow over the component's
// life (custom/related columns load asynchronously); since those default to
// hidden, the initial default selection is stable.
export function useColumns<Row>(entity: string, all: ColumnDef<Row>[]) {
  const [keys, setKeysState] = useState<string[]>(() => loadColumnPrefs(entity) ?? defaultKeys(all));
  const setKeys = (next: string[]) => {
    setKeysState(next);
    saveColumnPrefs(entity, next);
  };
  const reset = () => {
    resetColumnPrefs(entity);
    setKeysState(defaultKeys(all));
  };
  return { keys, setKeys, reset, columns: resolveColumns(all, keys) };
}

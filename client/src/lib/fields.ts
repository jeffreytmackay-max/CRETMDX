import type { FieldDef, FieldEntity } from './types';
import { isSupabaseConfigured } from './supabase';
import * as cloud from './cloud';

// Custom (user-defined) field definitions. Dispatches to the shared cloud table
// when Supabase is configured, otherwise persists to localStorage so the
// single-file / offline build works the same way. Definitions describe extra
// fields; the values live in each record's `custom` JSON map.

const KEY = 'cretmdx:fielddefs';

function loadLocal(): FieldDef[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as FieldDef[];
  } catch {
    /* ignore */
  }
  return [];
}

function saveLocal(defs: FieldDef[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(defs));
  } catch {
    /* storage may be unavailable */
  }
}

// Turn a human label into a stable snake_case key used inside the JSON map.
export function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'field'
  );
}

export async function getFieldDefs(entity: FieldEntity): Promise<FieldDef[]> {
  if (isSupabaseConfigured()) {
    try {
      return await cloud.listFieldDefs(entity);
    } catch {
      // Table not migrated yet — fall back to an empty list rather than crash.
      return [];
    }
  }
  return loadLocal()
    .filter((d) => d.entity === entity)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || (a.id || 0) - (b.id || 0));
}

export async function addFieldDef(def: FieldDef): Promise<FieldDef> {
  if (isSupabaseConfigured()) {
    return cloud.createFieldDef(def);
  }
  const defs = loadLocal();
  const id = defs.reduce((m, d) => Math.max(m, d.id || 0), 0) + 1;
  const row = { ...def, id };
  defs.push(row);
  saveLocal(defs);
  return row;
}

export async function removeFieldDef(id: number): Promise<void> {
  if (isSupabaseConfigured()) {
    return cloud.deleteFieldDef(id);
  }
  saveLocal(loadLocal().filter((d) => d.id !== id));
}

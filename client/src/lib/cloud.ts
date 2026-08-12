import type { Property, Lease, Transaction, FieldDef, FieldEntity } from './types';
import { getSupabase } from './supabase';

// Supabase-backed data layer. Mirrors the shape the `api` module needs, but
// talks to Postgres over PostgREST instead of localStorage. Only the columns
// below are written, so enriched/derived fields (property_name, etc.) never get
// pushed back to the database.

const PROPERTY_COLS = [
  'name', 'address', 'city', 'state', 'zip', 'country', 'lat', 'lng',
  'property_type', 'rentable_sqft', 'status', 'ownership', 'agile_office', 'notes',
  'custom', 'note_log',
] as const;

const LEASE_COLS = [
  'property_id', 'lease_name', 'counterparty', 'lease_type', 'role',
  'commencement_date', 'expiration_date', 'rentable_sqft', 'base_rent_annual',
  'escalation_pct', 'opex_psf', 'free_rent_months', 'ti_allowance_psf',
  'security_deposit', 'renewal_options', 'notice_period_months', 'status',
  'execution_date', 'rent_start_date', 'duration_months', 'usable_sqft',
  'loss_factor', 'building_type', 'property_use', 'lead_broker', 'rent_calc_type',
  'currency', 'parking_spaces', 'parking_rate_monthly', 'notes', 'custom', 'insurance',
  'note_log',
] as const;

const TRANSACTION_COLS = [
  'name', 'property_id', 'lease_id', 'type', 'stage', 'market', 'target_sqft',
  'estimated_value', 'probability', 'broker', 'lead', 'start_date',
  'target_close_date', 'notes', 'links',
  'space_type', 'progress', 'date_needed_by', 'priority', 'assigned_to',
  'coi_status', 'deposit_status', 'custom', 'note_log',
] as const;

function pick<T extends object>(obj: Partial<T>, cols: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of cols) {
    if (c in obj) out[c] = (obj as Record<string, unknown>)[c];
  }
  return out;
}

function sb() {
  const client = getSupabase();
  if (!client) throw new Error('Backend is not configured.');
  return client;
}

function check<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return data as T;
}

// ---- Properties ----
export async function listProperties(): Promise<Property[]> {
  const { data, error } = await sb().from('properties').select('*').order('id', { ascending: false });
  return check(data, error) as Property[];
}

export async function getProperty(id: number): Promise<Property | undefined> {
  const { data, error } = await sb().from('properties').select('*').eq('id', id).maybeSingle();
  return check(data, error) as Property | undefined;
}

export async function createProperty(body: Partial<Property>): Promise<Property> {
  const { data, error } = await insertRow('properties', pick(body, PROPERTY_COLS));
  return check(data, error) as Property;
}

export async function updateProperty(id: number, body: Partial<Property>): Promise<Property> {
  const { data, error } = await updateRow('properties', id, pick(body, PROPERTY_COLS));
  return check(data, error) as Property;
}

export async function deleteProperty(id: number): Promise<void> {
  // Leases cascade via the foreign key (ON DELETE CASCADE).
  const { error } = await sb().from('properties').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---- Leases ----
export async function listLeasesEnriched(): Promise<Lease[]> {
  const [props, leases] = await Promise.all([listProperties(), rawLeases()]);
  const byId = new Map(props.map((p) => [p.id, p]));
  return leases
    .map((l) => {
      const p = byId.get(l.property_id);
      return { ...l, property_name: p?.name, property_city: p?.city, property_state: p?.state };
    })
    .sort((a, b) => (a.expiration_date || '').localeCompare(b.expiration_date || ''));
}

async function rawLeases(): Promise<Lease[]> {
  const { data, error } = await sb().from('leases').select('*');
  return check(data, error) as Lease[];
}

export async function getLease(id: number): Promise<Lease | undefined> {
  const { data, error } = await sb().from('leases').select('*').eq('id', id).maybeSingle();
  return check(data, error) as Lease | undefined;
}

export async function createLease(body: Partial<Lease>): Promise<Lease> {
  const { data, error } = await insertRow('leases', pick(body, LEASE_COLS));
  return check(data, error) as Lease;
}

export async function updateLease(id: number, body: Partial<Lease>): Promise<Lease> {
  const { data, error } = await updateRow('leases', id, pick(body, LEASE_COLS));
  return check(data, error) as Lease;
}

export async function deleteLease(id: number): Promise<void> {
  const { error } = await sb().from('leases').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---- Transactions ----
export async function listTransactions(): Promise<Transaction[]> {
  const { data, error } = await sb()
    .from('transactions')
    .select('*')
    .order('id', { ascending: false });
  return check(data, error) as Transaction[];
}

// If the project's schema is missing an optional column (e.g. `links` before the
// migration is run), PostgREST returns a "could not find the 'x' column" error.
// Return that column name so we can drop it and retry, keeping saves working.
function missingColumn(msg?: string): string | null {
  if (!msg) return null;
  let m = msg.match(/could not find the '([^']+)' column/i);
  if (m) return m[1];
  m = msg.match(/column "([^"]+)" .*does not exist/i);
  return m ? m[1] : null;
}

async function insertRow(table: string, row: Record<string, unknown>) {
  let r = await sb().from(table).insert(row).select().single();
  for (let col = missingColumn(r.error?.message); col && col in row; col = missingColumn(r.error?.message)) {
    delete row[col];
    r = await sb().from(table).insert(row).select().single();
  }
  return r;
}

async function updateRow(table: string, id: number, row: Record<string, unknown>) {
  let r = await sb().from(table).update(row).eq('id', id).select().single();
  for (let col = missingColumn(r.error?.message); col && col in row; col = missingColumn(r.error?.message)) {
    delete row[col];
    r = await sb().from(table).update(row).eq('id', id).select().single();
  }
  return r;
}

export async function createTransaction(body: Partial<Transaction>): Promise<Transaction> {
  const { data, error } = await insertRow('transactions', pick(body, TRANSACTION_COLS));
  return check(data, error) as Transaction;
}

export async function updateTransaction(id: number, body: Partial<Transaction>): Promise<Transaction> {
  const { data, error } = await updateRow('transactions', id, pick(body, TRANSACTION_COLS));
  return check(data, error) as Transaction;
}

export async function deleteTransaction(id: number): Promise<void> {
  const { error } = await sb().from('transactions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

async function listLeasesRaw(): Promise<Lease[]> {
  return rawLeases();
}

// ---- Custom field definitions ----
export async function listFieldDefs(entity: FieldEntity): Promise<FieldDef[]> {
  const { data, error } = await sb()
    .from('field_defs')
    .select('*')
    .eq('entity', entity)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  return check(data, error) as FieldDef[];
}

export async function createFieldDef(body: FieldDef): Promise<FieldDef> {
  const { data, error } = await sb().from('field_defs').insert(body).select().single();
  return check(data, error) as FieldDef;
}

export async function deleteFieldDef(id: number): Promise<void> {
  const { error } = await sb().from('field_defs').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// Full snapshot of the cloud portfolio (raw rows), for download/backup.
export async function exportAll(): Promise<{
  properties: Property[];
  leases: Lease[];
  transactions: Transaction[];
}> {
  const [properties, leases, transactions] = await Promise.all([
    listProperties(),
    listLeasesRaw(),
    listTransactions(),
  ]);
  return { properties, leases, transactions };
}

// Replace the entire cloud portfolio with the given snapshot (used by Import).
// Clears existing rows, then re-inserts with id remapping. Destructive by design
// — the Import flow warns the user first.
export async function replaceAll(data: {
  properties?: Property[];
  leases?: Lease[];
  transactions?: Transaction[];
}): Promise<{ properties: number; leases: number; transactions: number }> {
  const c = sb();
  // Delete transactions first, then properties (leases cascade via FK).
  let err = (await c.from('transactions').delete().gte('id', 0)).error;
  if (err) throw new Error(err.message);
  err = (await c.from('properties').delete().gte('id', 0)).error;
  if (err) throw new Error(err.message);
  return pushLocalToCloud(
    data.properties || [],
    data.leases || [],
    data.transactions || [],
  );
}

// ---- Bulk helpers ----
export async function countAll(): Promise<{ properties: number; leases: number; transactions: number }> {
  const c = sb();
  const [p, l, t] = await Promise.all([
    c.from('properties').select('*', { count: 'exact', head: true }),
    c.from('leases').select('*', { count: 'exact', head: true }),
    c.from('transactions').select('*', { count: 'exact', head: true }),
  ]);
  return { properties: p.count || 0, leases: l.count || 0, transactions: t.count || 0 };
}

// Push the current local portfolio into the cloud. Inserts properties first to
// learn their new database ids, then remaps lease/transaction property_id
// references onto those new ids. Returns how many rows were uploaded.
export async function pushLocalToCloud(
  properties: Property[],
  leases: Lease[],
  transactions: Transaction[],
): Promise<{ properties: number; leases: number; transactions: number }> {
  const c = sb();
  const idMap = new Map<number, number>();

  for (const p of properties) {
    const { data, error } = await c.from('properties').insert(pick(p, PROPERTY_COLS)).select('id').single();
    if (error) throw new Error(error.message);
    idMap.set(p.id, (data as { id: number }).id);
  }

  let leaseCount = 0;
  for (const l of leases) {
    const row = pick(l, LEASE_COLS);
    row.property_id = idMap.get(l.property_id) ?? null;
    const { error } = await c.from('leases').insert(row);
    if (error) throw new Error(error.message);
    leaseCount++;
  }

  let txnCount = 0;
  for (const t of transactions) {
    const row = pick(t, TRANSACTION_COLS);
    row.property_id = t.property_id == null ? null : idMap.get(t.property_id) ?? null;
    const { error } = await c.from('transactions').insert(row);
    if (error) throw new Error(error.message);
    txnCount++;
  }

  return { properties: properties.length, leases: leaseCount, transactions: txnCount };
}

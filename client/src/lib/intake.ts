// Real estate request intake: the submitted form, its mapping onto a
// transaction at the "Intake" stage, and a public (no-login) submit path that
// inserts directly via the Supabase anon role.

import type { Transaction } from './types';
import { getSupabase } from './supabase';
import { serializeLinks } from './links';

export interface IntakeForm {
  project: string; // project / requirement name (required)
  requesting_group: string; // Aviation / Commercial / Corporate
  type: string; // request type (New Lease, Renewal, …)
  space_type: string;
  business_unit: string; // region / business unit
  location: string; // desired location / market
  target_sqft: string; // kept as string from the input
  occupancy_date: string; // desired occupancy date
  term_years: string;
  budget_annual: string; // estimated annual budget
  priority: string;
  requestor: string; // submitter name (required)
  requestor_email: string;
  justification: string; // business justification (required)
  link: string; // optional supporting link
}

export function emptyIntake(): IntakeForm {
  return {
    project: '', requesting_group: '', type: 'New Lease', space_type: '', business_unit: '',
    location: '', target_sqft: '', occupancy_date: '', term_years: '', budget_annual: '',
    priority: 'Medium', requestor: '', requestor_email: '', justification: '', link: '',
  };
}

function numOrUndef(s: string): number | undefined {
  const n = parseFloat((s || '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

// Compose the human-readable intake summary stored in the transaction notes, so
// the full request travels with the deal even on a minimal schema.
function intakeNotes(f: IntakeForm): string {
  const lines = [
    `Real estate request submitted ${new Date().toLocaleString()}.`,
    f.requestor && `Requestor: ${f.requestor}${f.requestor_email ? ` <${f.requestor_email}>` : ''}`,
    f.requesting_group && `Requesting group: ${f.requesting_group}`,
    f.business_unit && `Business unit / region: ${f.business_unit}`,
    f.location && `Desired location: ${f.location}`,
    f.occupancy_date && `Desired occupancy: ${f.occupancy_date}`,
    f.justification && `\nBusiness justification:\n${f.justification}`,
  ].filter(Boolean);
  return lines.join('\n');
}

export function buildIntakeTransaction(f: IntakeForm): Partial<Transaction> {
  const t: Partial<Transaction> = {
    name: f.project.trim(),
    type: f.type || 'New Lease',
    stage: 'Intake',
    space_type: f.space_type || undefined,
    market: f.business_unit || undefined,
    target_sqft: numOrUndef(f.target_sqft),
    term_years: numOrUndef(f.term_years),
    estimated_value: numOrUndef(f.budget_annual),
    priority: f.priority || undefined,
    target_close_date: f.occupancy_date || undefined,
    lead: f.requestor || undefined,
    notes: intakeNotes(f),
  };
  if (f.link.trim()) t.links = serializeLinks([{ name: 'Request attachment', url: f.link.trim() }]);
  return t;
}

// Columns safe to insert anonymously (all base-schema columns). Kept lean so the
// public path never depends on later migrations.
const PUBLIC_COLS = [
  'name', 'type', 'stage', 'space_type', 'market', 'target_sqft', 'estimated_value',
  'term_years', 'priority', 'target_close_date', 'lead', 'notes', 'links',
];

function missingColumn(msg?: string): string | null {
  if (!msg) return null;
  let m = msg.match(/could not find the '([^']+)' column/i);
  if (m) return m[1];
  m = msg.match(/column "([^"]+)" .*does not exist/i);
  return m ? m[1] : null;
}

// Public submit: a plain INSERT (no select-back, which the anon role can't do),
// self-healing around columns a not-yet-run migration may be missing.
export async function submitIntakePublic(t: Partial<Transaction>): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    throw new Error(
      'This request form is not connected to the backend yet. Please contact the Real Estate team.',
    );
  }
  const row: Record<string, unknown> = {};
  for (const c of PUBLIC_COLS) {
    const v = (t as Record<string, unknown>)[c];
    if (v !== undefined) row[c] = v;
  }
  row.stage = 'Intake'; // required by the anon insert policy
  let res = await sb.from('transactions').insert(row);
  for (let guard = 0; res.error && guard < 8; guard++) {
    const col = missingColumn(res.error.message);
    if (!col || !(col in row)) break;
    delete row[col];
    res = await sb.from('transactions').insert(row);
  }
  if (res.error) throw new Error(res.error.message);
}

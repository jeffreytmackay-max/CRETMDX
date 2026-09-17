// Shared model + tokens for the per-transaction slide exports (PDF and PPTX),
// built to the TransMedics Brand & Collateral System v1.0: clinical-premium,
// crimson-primary, warm neutrals, Mulish type, eyebrow labels, stat cards, and
// the ALL-CAPS confidentiality line. Both exporters consume slideModelFor() so
// the PDF deck and the PowerPoint deck stay identical.

import type { Property, Lease, Transaction, FieldDef } from './types';
import { usd, num, fmtDate } from './format';
import { fmtStamp } from '../components/ActivityLog';

// Palette (hex without '#', for reuse by pptxgenjs which wants bare hex).
export const DECK = {
  crimson: '9D2235', // primary
  wine: '740223', // depth / hover
  rose: 'C45057',
  brightRed: 'D50032',
  coral: 'FF7F41',
  peach: 'FFAE81',
  charcoal: '302F32', // ink
  slate: '44414F',
  gray: '75787B',
  warmGray: 'DAD3D1', // borders
  cream: 'EFECEA', // soft surfaces
  paper: 'FFFFFF',
  success: '2E7D52',
};

// Mulish is the licensed brand face's open substitute; fall back to system.
export const DECK_FONT = 'Mulish';
export const DECK_FONT_STACK =
  "'Mulish', 'Avenir Next LT Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export type ChipTone = 'crimson' | 'coral' | 'slate' | 'success' | 'neutral';

export interface SlideStat {
  value: string;
  label: string;
}
export interface SlideField {
  label: string;
  value: string;
}
export interface SlideComment {
  stamp: string;
  author: string;
  text: string;
}
export interface SlideModel {
  eyebrow: string;
  title: string;
  subtitle: string;
  chips: { text: string; tone: ChipTone }[];
  stats: SlideStat[];
  fields: SlideField[];
  comments: SlideComment[];
  notes: string;
}

function priorityTone(p?: string): ChipTone {
  if (p === 'High') return 'crimson';
  if (p === 'Medium') return 'coral';
  return 'slate';
}

function customText(v: unknown): string {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  if (v == null) return '';
  return String(v);
}

// Build the slide model for one transaction.
export function slideModelFor(
  t: Transaction,
  propName: Map<number, string>,
  leaseName: Map<number, string>,
  defs: FieldDef[],
  _props?: Property[],
  _leases?: Lease[],
): SlideModel {
  const property = t.property_id != null ? propName.get(t.property_id) || '' : '';
  const lease = t.lease_id != null ? leaseName.get(t.lease_id) || '' : '';

  const chips: { text: string; tone: ChipTone }[] = [{ text: t.stage || '—', tone: 'crimson' }];
  if (t.priority) chips.push({ text: `${t.priority} priority`, tone: priorityTone(t.priority) });
  if (t.progress) chips.push({ text: t.progress, tone: 'neutral' });
  if (t.coi_status) chips.push({ text: `COI: ${t.coi_status}`, tone: 'slate' });

  const stats: SlideStat[] = [
    { value: t.target_sqft ? num(t.target_sqft) : '—', label: 'Target SF' },
    { value: t.estimated_value ? usd(t.estimated_value) : '—', label: 'Est. Annual Cost' },
    { value: t.probability != null ? `${t.probability}%` : '—', label: 'Confidence' },
    {
      value: fmtDate(t.date_needed_by || t.target_close_date),
      label: t.date_needed_by ? 'Date Needed By' : 'Target Close',
    },
  ];

  const rawFields: SlideField[] = [
    { label: 'Type', value: t.type || '' },
    { label: 'Space Type', value: t.space_type || '' },
    { label: 'Region / Business Unit', value: t.market || '' },
    { label: 'Property', value: property },
    { label: 'Linked Lease', value: lease },
    { label: 'Assigned To', value: t.assigned_to || '' },
    { label: 'External Broker', value: t.broker || '' },
    { label: 'Internal Lead', value: t.lead || '' },
    { label: 'Start Date', value: t.start_date ? fmtDate(t.start_date) : '' },
    { label: 'Target Close', value: t.target_close_date ? fmtDate(t.target_close_date) : '' },
    { label: 'Security Deposit', value: t.deposit_status || '' },
  ];
  for (const d of [...defs].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))) {
    const v = customText(t.custom?.[d.field_key]);
    if (v) rawFields.push({ label: d.label, value: v });
  }
  const fields = rawFields.filter((f) => f.value && f.value.trim());

  const comments: SlideComment[] = [...(t.note_log || [])]
    .sort((a, b) => (b.ts || '').localeCompare(a.ts || ''))
    .slice(0, 4)
    .map((n) => ({ stamp: fmtStamp(n.ts), author: n.author || '', text: n.text }));

  return {
    eyebrow: `Real Estate Transaction · ${t.stage || ''}`.toUpperCase(),
    title: t.name || 'Untitled Transaction',
    subtitle: [t.type, t.space_type, t.market].filter(Boolean).join('  ·  '),
    chips,
    stats,
    fields,
    comments,
    notes: (t.notes || '').trim(),
  };
}

export const CONFIDENTIAL = 'TRANSMEDICS PROPRIETARY & CONFIDENTIAL INFORMATION';
export function deckDateLabel(): string {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
export function deckFileStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

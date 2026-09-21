// Single source of truth for the TransMedics Real Estate Transaction Process
// (from the team's flowchart): the workflow stages, the DOA (Delegation of
// Authority) approval matrix, legal routing, and the guided step checklist.
// Consumed by the Transactions board/form, the approval panel, and the Process
// reference page so every surface stays in sync.

import type { Transaction, Approval, ProcessState } from './types';
import { dealValue } from './deal';

// ---- Workflow stages (the shared spine of the flowchart) ----
export const STAGES = [
  'Intake',
  'Search / Survey',
  'Proposals & LOI',
  'Business Case',
  'Negotiation',
  'Legal Review',
  'DOA Approval',
  'Execution',
  'Onboarding',
  'Handoff',
] as const;
export type Stage = (typeof STAGES)[number];
export const TERMINAL_STAGE: Stage = 'Handoff';

// Map the app's earlier five-stage vocabulary onto the new spine so existing
// records land in the right column without a data migration.
const LEGACY_STAGE_MAP: Record<string, Stage> = {
  'To Be Assigned': 'Intake',
  'Site Search': 'Search / Survey',
  'Negotiating Legal Terms': 'Negotiation',
  'Lease Execution': 'Execution',
  Completed: 'Handoff',
};
export function normalizeStage(stage?: string): Stage {
  if (!stage) return 'Intake';
  if ((STAGES as readonly string[]).includes(stage)) return stage as Stage;
  return LEGACY_STAGE_MAP[stage] || 'Intake';
}

// Top-border accent per stage; the DOA gate uses the flowchart's amber.
export const STAGE_ACCENT: Record<Stage, string> = {
  Intake: 'border-t-slate-400',
  'Search / Survey': 'border-t-[#c45957]',
  'Proposals & LOI': 'border-t-[#ff7f41]',
  'Business Case': 'border-t-[#ffae81]',
  Negotiation: 'border-t-amber-400',
  'Legal Review': 'border-t-[#44546a]',
  'DOA Approval': 'border-t-[#d9a441]',
  Execution: 'border-t-sky-500',
  Onboarding: 'border-t-violet-400',
  Handoff: 'border-t-emerald-600',
};

// ---- DOA approval matrix (drives off total contract value = deal value) ----
export interface DoaBand {
  min: number;
  max: number | null; // exclusive upper bound; null = no ceiling
  label: string;
  approvers: string; // human-readable approver chain
  financeIfUnbudgeted?: boolean;
}
export const DOA_MATRIX: DoaBand[] = [
  { min: 0, max: 10000, label: 'Under $10K', approvers: 'Director' },
  { min: 10000, max: 25000, label: '$10K to under $25K', approvers: 'Sr. Director or Exec. Director' },
  { min: 25000, max: 50000, label: '$25K to under $50K', approvers: 'VP' },
  { min: 50000, max: 100000, label: '$50K to under $100K', approvers: 'SVP or C-level', financeIfUnbudgeted: true },
  { min: 100000, max: 1000000, label: '$100K to under $1M', approvers: 'SVP or C-level, CFO' },
  { min: 1000000, max: 10000000, label: '$1M to under $10M', approvers: 'SVP or C-level, CFO, CEO' },
  { min: 10000000, max: null, label: '$10M and above', approvers: 'SVP or C-level, CFO, CEO, Board of Directors' },
];

export function doaBand(value: number): DoaBand {
  return DOA_MATRIX.find((b) => value >= b.min && (b.max == null || value < b.max)) || DOA_MATRIX[0];
}

// The list of approver roles required for a transaction, split from the band's
// chain. Adds "Finance review" for unbudgeted deals in the $50–100K band.
export function requiredRoles(t: Transaction): string[] {
  const band = doaBand(dealValue(t));
  const roles = band.approvers.split(',').map((s) => s.trim()).filter(Boolean);
  if (band.financeIfUnbudgeted && t.budgeted === false) roles.push('Finance review (unbudgeted)');
  return roles;
}

export interface ApprovalStatus {
  band: DoaBand;
  roles: string[];
  approved: Approval[];
  done: number;
  total: number;
  complete: boolean;
  label: string; // short chip label
}
export function approvalStatus(t: Transaction): ApprovalStatus {
  const band = doaBand(dealValue(t));
  const roles = requiredRoles(t);
  const approved = (t.approvals || []).filter((a) => a.role && roles.includes(a.role) && a.date);
  const doneRoles = new Set(approved.map((a) => a.role));
  const done = roles.filter((r) => doneRoles.has(r)).length;
  const total = roles.length;
  const complete = total > 0 && done >= total;
  const label = total === 0 ? '—' : complete ? 'Approved' : `Approval ${done}/${total}`;
  return { band, roles, approved, done, total, complete, label };
}

// ---- Legal routing (route by transaction/space type) ----
export interface LegalRoute {
  category: string;
  route: string;
}
export function legalRoute(t: { type?: string; space_type?: string }): LegalRoute {
  const space = (t.space_type || '').toLowerCase();
  const type = (t.type || '').toLowerCase();
  if (space === 'nop' || type.includes('nop')) return { category: 'NOPs', route: 'Peter Klein' };
  if (space === 'aviation' || type.includes('aviation')) return { category: 'Aviation', route: 'Soar Aviation' };
  return { category: 'Corporate leases', route: 'General Counsel' };
}

// ---- Guided process checklist ----
export type StepKind = 'task' | 'decision';
export interface ProcessStep {
  id: string;
  phase: string;
  label: string;
  detail?: string;
  kind: StepKind;
  options?: string[]; // for decisions
  when?: (t: Transaction, answers: Record<string, string>) => boolean;
}

export const PROCESS_STEPS: ProcessStep[] = [
  // Intake & requirement definition
  { id: 'intake', phase: 'Intake', kind: 'task', label: 'Intake and define requirement', detail: 'Sponsor, program, timing, budget' },
  { id: 'review_lease', phase: 'Intake', kind: 'task', label: 'Review existing lease', detail: 'Options, notice dates, rent', when: (t) => t.type === 'Renewal' },
  { id: 'stay_go', phase: 'Intake', kind: 'decision', label: 'Stay vs. go analysis', detail: 'Compare renewal to market', options: ['Renew', 'Relocate'], when: (t) => t.type === 'Renewal' },
  { id: 'nop_client', phase: 'Intake', kind: 'decision', label: 'NOP at a client site?', options: ['Yes', 'No'], when: (t) => t.type !== 'Renewal' },
  { id: 'client_site', phase: 'Intake', kind: 'task', label: 'Client-site agreement', detail: 'License or use terms', when: (_t, a) => a.nop_client === 'Yes' },
  { id: 'microhub', phase: 'Intake', kind: 'decision', label: 'MicroHub requirement?', detail: 'Under 1,000 SF, 6–12 mo', options: ['Yes', 'No'], when: (t, a) => t.type !== 'Renewal' && a.nop_client === 'No' },

  // Sourcing
  { id: 'short_term', phase: 'Sourcing', kind: 'task', label: 'Short-term search', detail: 'Direct, flex or sublease', when: (_t, a) => a.nop_client === 'No' && a.microhub === 'Yes' },
  { id: 'market_survey', phase: 'Sourcing', kind: 'task', label: 'Market survey', detail: 'Broker, tours', when: (t, a) => (t.type !== 'Renewal' && a.nop_client === 'No' && a.microhub === 'No') || a.stay_go === 'Relocate' },

  // Deal
  { id: 'loi', phase: 'Deal', kind: 'task', label: 'Proposals and LOI', detail: 'Short form for MicroHubs' },
  { id: 'business_case', phase: 'Deal', kind: 'task', label: 'Business case', detail: 'Financials, total contract value' },
  { id: 'negotiation', phase: 'Deal', kind: 'task', label: 'Agreement negotiation', detail: 'Lease, sublease or license' },
  { id: 'legal_review', phase: 'Deal', kind: 'task', label: 'Legal review', detail: 'Route by transaction type' },
  { id: 'doa', phase: 'Deal', kind: 'task', label: 'DOA approval', detail: 'Based on total contract value' },
  { id: 'execution', phase: 'Deal', kind: 'task', label: 'Execution via DocuSign', detail: 'Landlord or TransMedics initiates' },

  // Onboarding
  { id: 'new_location', phase: 'Onboarding', kind: 'decision', label: 'New location?', detail: 'New site or relocation', options: ['Yes', 'No'] },
  { id: 'w9', phase: 'Onboarding', kind: 'task', label: 'Request W-9 and banking', detail: 'On company or bank letterhead', when: (_t, a) => a.new_location === 'Yes' },
  { id: 'iapprove', phase: 'Onboarding', kind: 'task', label: 'Add landlord to iApprove', detail: 'Landlord set up as vendor', when: (_t, a) => a.new_location === 'Yes' },
  { id: 'deposit', phase: 'Onboarding', kind: 'decision', label: 'Security deposit?', options: ['Yes', 'No'] },
  { id: 'deposit_pay', phase: 'Onboarding', kind: 'task', label: 'Security deposit payment', detail: 'Landlord invoice, then requisition', when: (_t, a) => a.deposit === 'Yes' },
  { id: 'handoff', phase: 'Onboarding', kind: 'task', label: 'Handoff', detail: 'Abstract lease, add site to systems' },
];

export const PROCESS_PHASES = ['Intake', 'Sourcing', 'Deal', 'Onboarding'];

// Answers map for decision steps, derived from stored process state.
export function processAnswers(t: Transaction): Record<string, string> {
  const out: Record<string, string> = {};
  const p = t.process || {};
  for (const [id, st] of Object.entries(p)) if (st?.answer) out[id] = st.answer;
  return out;
}

// The steps currently applicable to a transaction, given its answers.
export function visibleSteps(t: Transaction): ProcessStep[] {
  const answers = processAnswers(t);
  return PROCESS_STEPS.filter((s) => !s.when || s.when(t, answers));
}

// Completion across the applicable steps: a task counts when done, a decision
// counts when answered.
export function processProgress(t: Transaction): { done: number; total: number; pct: number } {
  const steps = visibleSteps(t);
  const p = t.process || {};
  let done = 0;
  for (const s of steps) {
    const st: ProcessState | undefined = p[s.id];
    if (s.kind === 'decision' ? !!st?.answer : !!st?.done) done++;
  }
  const total = steps.length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

import Anthropic from '@anthropic-ai/sdk';
import type { Lease, LeaseInsurance } from './types';

// Browser-only (BYOK) integration with Claude for abstracting lease PDFs and
// translating foreign-language documents. The user's API key is stored only in
// their own browser's localStorage and used to call the Anthropic API directly.

const KEY_STORAGE = 'cretmdx:anthropic_key';
const MODEL = 'claude-opus-4-8';

export function getApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) || '';
  } catch {
    return '';
  }
}
export function setApiKey(key: string): void {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key.trim());
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* storage unavailable */
  }
}
export function hasApiKey(): boolean {
  return getApiKey().length > 0;
}

export interface LeaseAbstract {
  lease_name: string;
  counterparty: string;
  role: string;
  lease_type: string;
  commencement_date: string;
  expiration_date: string;
  rentable_sqft: number;
  base_rent_annual: number;
  escalation_pct: number;
  opex_psf: number;
  free_rent_months: number;
  ti_allowance_psf: number;
  security_deposit: number;
  renewal_options: string;
  notice_period_months: number;
  // CBRE-style abstract fields
  execution_date: string;
  rent_start_date: string;
  duration_months: number;
  usable_sqft: number;
  loss_factor: number;
  building_type: string;
  property_use: string;
  lead_broker: string;
  rent_calc_type: string;
  currency: string;
  parking_spaces: number;
  parking_rate_monthly: number;
  detected_language: string;
  english_summary: string;
  translated_clauses: string;
}

const SYSTEM = `You are a corporate real estate lease administrator. You read commercial lease
documents (in any language) and produce a precise, structured abstract of the key business terms.
You are careful with dates, money, and measurements, and you never invent terms that are not in
the document.`;

const INSTRUCTIONS = `Read the attached lease document and extract its key terms.

Return ONLY a single JSON object (no markdown, no prose, no code fences) with EXACTLY these keys:

- "lease_name": short descriptive name (e.g. "One Market HQ — Floors 20-24"). If none, use the property/suite.
- "counterparty": the landlord/owner name (the tenant's counterparty).
- "role": "Tenant" or "Landlord" — the role of the party this abstract is prepared for (usually "Tenant").
- "lease_type": "Direct" or "Sublease".
- "commencement_date": lease/rent commencement date as "YYYY-MM-DD" (empty string if not found).
- "expiration_date": lease expiration date as "YYYY-MM-DD" (empty string if not found).
- "rentable_sqft": rentable area as a NUMBER in square feet (convert from square meters if needed: 1 m² = 10.7639 sf). 0 if unknown.
- "base_rent_annual": total ANNUAL base rent as a NUMBER in the document's currency (convert monthly→annual ×12). 0 if unknown.
- "escalation_pct": annual rent escalation as a NUMBER percent (e.g. 3 for 3%). 0 if none.
- "opex_psf": operating expenses / CAM as a NUMBER per square foot per year. 0 if unknown.
- "free_rent_months": free/abated rent as a NUMBER of months. 0 if none.
- "ti_allowance_psf": tenant improvement allowance as a NUMBER per square foot. 0 if none.
- "security_deposit": security deposit as a NUMBER. 0 if none.
- "renewal_options": renewal/extension options described in plain English (e.g. "Two 10-year options at 95% FMV"). "None" if none.
- "notice_period_months": required notice period before expiration as a NUMBER of months. 0 if unknown.
- "execution_date": the lease execution/signing date as "YYYY-MM-DD" (empty if not found).
- "rent_start_date": the rent commencement date (when base rent first becomes payable) as "YYYY-MM-DD" (empty if not found; may differ from commencement when there is a rent-free build-out period).
- "duration_months": the total lease term in NUMBER of months. 0 if unknown.
- "usable_sqft": usable area as a NUMBER in square feet. 0 if unknown.
- "loss_factor": the loss/load factor as a NUMBER percent (rentable vs usable). 0 if unknown.
- "building_type": building/space type (e.g. "Office", "Lab", "Office/Lab", "Industrial", "Retail"). "" if unknown.
- "property_use": permitted use of the premises in a few words. "" if unknown.
- "lead_broker": the lead broker or agent named, if any. "" if none.
- "rent_calc_type": rent structure — one of "Net" (triple net / NNN), "Gross", or "Modified Gross". "" if unclear.
- "currency": ISO currency code of the rent (e.g. "USD", "EUR"). Default "USD".
- "parking_spaces": number of parking spaces included. 0 if none.
- "parking_rate_monthly": monthly charge per parking space as a NUMBER. 0 if none.
- "detected_language": the primary language of the document (e.g. "English", "Spanish", "Japanese").
- "english_summary": a thorough English summary that captures the most important OPTIONS & CRITICAL EVENTS (renewal/extension options, purchase options, rights of first offer/refusal, TI deadlines, surrender obligations), KEY CLAUSES (operating expenses, security deposit / letter of credit, TI allowance, rent offsets), and any ABSTRACTOR NOTES or open items. Use short labeled lines or bullets.
- "translated_clauses": if the document is NOT in English, an English translation of the most important clauses (rent, term, renewal, termination); otherwise an empty string.

Use numbers (not strings) for all numeric fields. Use "" for unknown text fields and 0 for unknown numbers.
Output the JSON object and nothing else.`;

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function extractJson(text: string): LeaseAbstract {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('Could not parse the model response as JSON.');
  }
}

export async function abstractLeasePdf(file: File): Promise<LeaseAbstract> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No Anthropic API key set. Add one in Settings.');
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Please upload a PDF file.');
  }
  if (file.size > 30 * 1024 * 1024) {
    throw new Error('PDF is larger than 30 MB. Please upload a smaller file.');
  }

  const data = await fileToBase64(file);
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data },
          },
          { type: 'text', text: INSTRUCTIONS },
        ],
      },
    ],
  });

  const text = (resp.content as Array<{ type: string; text?: string }>)
    .filter((b) => b.type === 'text')
    .map((b) => b.text || '')
    .join('\n');

  return extractJson(text);
}

// ---- Insurance requirements extraction (from the lease document) ----
const INSURANCE_INSTRUCTIONS = `Read the attached commercial lease and extract ONLY the tenant's
INSURANCE REQUIREMENTS (the coverage the lease requires the tenant to carry and the certificate
requirements). Do not invent terms that are not in the document.

Return ONLY a single JSON object (no markdown, no prose, no code fences) with EXACTLY these keys:

- "requirements": a concise plain-English summary of the required insurance (coverage types + limits).
- "additional_insured": the exact parties the tenant must name as ADDITIONAL INSURED (landlord, property manager, lender, etc.), as written. "" if not specified.
- "certificate_holder": who the certificate of insurance must be issued to / delivered to (name and address if given). "" if not specified.
- "cgl_each_occurrence": Commercial General Liability required limit PER OCCURRENCE, as a NUMBER (e.g. 1000000). 0 if not specified.
- "cgl_aggregate": Commercial General Liability GENERAL AGGREGATE limit, as a NUMBER. 0 if not specified.
- "auto_liability": Automobile liability required limit (combined single limit), as a NUMBER. 0 if not specified.
- "umbrella": Umbrella/Excess liability required limit, as a NUMBER. 0 if not specified.
- "employers_liability": Employer's liability required limit, as a NUMBER. 0 if not specified.
- "workers_comp": true if workers' compensation (statutory) is required, else false.
- "property_required": true if the tenant must carry property / special-form / "all risk" coverage on its property or improvements, else false.
- "waiver_of_subrogation": true if a waiver of subrogation is required, else false.
- "primary_noncontributory": true if the tenant's coverage must be primary and non-contributory, else false.
- "notes": any other insurance conditions worth noting (notice-of-cancellation days, rating requirement like "A-VII or better", who pays, etc.). "" if none.

Use numbers (not strings) for numeric fields and 0 when a limit is not stated. Use true/false for the
booleans. Output the JSON object and nothing else.`;

interface InsuranceAbstract {
  requirements?: string;
  additional_insured?: string;
  certificate_holder?: string;
  cgl_each_occurrence?: number;
  cgl_aggregate?: number;
  auto_liability?: number;
  umbrella?: number;
  employers_liability?: number;
  workers_comp?: boolean;
  property_required?: boolean;
  waiver_of_subrogation?: boolean;
  primary_noncontributory?: boolean;
  notes?: string;
}

function respText(resp: { content: unknown }): string {
  return (resp.content as Array<{ type: string; text?: string }>)
    .filter((b) => b.type === 'text')
    .map((b) => b.text || '')
    .join('\n');
}

function insuranceFromResponse(text: string): LeaseInsurance {
  const a = extractJson(text) as unknown as InsuranceAbstract;
  return {
    requirements: a.requirements || '',
    additional_insured: a.additional_insured || '',
    certificate_holder: a.certificate_holder || '',
    cgl_each_occurrence: a.cgl_each_occurrence || 0,
    cgl_aggregate: a.cgl_aggregate || 0,
    auto_liability: a.auto_liability || 0,
    umbrella: a.umbrella || 0,
    employers_liability: a.employers_liability || 0,
    workers_comp: !!a.workers_comp,
    property_required: !!a.property_required,
    waiver_of_subrogation: !!a.waiver_of_subrogation,
    primary_noncontributory: !!a.primary_noncontributory,
    notes: a.notes || '',
  };
}

// Read a lease PDF (or image) and return just its insurance requirements.
export async function extractInsuranceFromPdf(file: Blob): Promise<LeaseInsurance> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No Anthropic API key set. Add one in Settings.');
  const data = await fileToBase64(file as File);
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } },
          { type: 'text', text: INSURANCE_INSTRUCTIONS },
        ],
      },
    ],
  });
  return insuranceFromResponse(respText(resp));
}

// Fallback for devices without the PDF: extract insurance requirements from the
// lease's synced abstract text / notes. Only as complete as that text.
export async function extractInsuranceFromText(text: string): Promise<LeaseInsurance> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No Anthropic API key set. Add one in Settings.');
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              INSURANCE_INSTRUCTIONS +
              '\n\nThere is no document attached; use ONLY the lease abstract / notes below. ' +
              'If the notes do not mention a value, leave it empty/0/false.\n\nLEASE ABSTRACT / NOTES:\n\n' +
              text,
          },
        ],
      },
    ],
  });
  return insuranceFromResponse(respText(resp));
}

// Map the AI abstract onto our Lease shape for the edit form.
export function abstractToLease(a: LeaseAbstract): Partial<Lease> {
  const notesParts: string[] = [];
  if (a.detected_language) notesParts.push(`Source language: ${a.detected_language}`);
  if (a.english_summary) notesParts.push(`\nSummary:\n${a.english_summary}`);
  if (a.translated_clauses) notesParts.push(`\nKey clauses (translated):\n${a.translated_clauses}`);
  notesParts.push('\n(Abstracted from PDF by Claude — please verify against the source document.)');

  return {
    lease_name: a.lease_name || 'Untitled Lease',
    counterparty: a.counterparty || '',
    role: a.role === 'Landlord' ? 'Landlord' : 'Tenant',
    lease_type: a.lease_type === 'Sublease' ? 'Sublease' : 'Direct',
    commencement_date: a.commencement_date || '',
    expiration_date: a.expiration_date || '',
    rentable_sqft: a.rentable_sqft || 0,
    base_rent_annual: a.base_rent_annual || 0,
    escalation_pct: a.escalation_pct || 0,
    opex_psf: a.opex_psf || 0,
    free_rent_months: a.free_rent_months || 0,
    ti_allowance_psf: a.ti_allowance_psf || 0,
    security_deposit: a.security_deposit || 0,
    renewal_options: a.renewal_options || 'None',
    notice_period_months: a.notice_period_months || 0,
    execution_date: a.execution_date || '',
    rent_start_date: a.rent_start_date || '',
    duration_months: a.duration_months || 0,
    usable_sqft: a.usable_sqft || 0,
    loss_factor: a.loss_factor || 0,
    building_type: a.building_type || '',
    property_use: a.property_use || '',
    lead_broker: a.lead_broker || '',
    rent_calc_type: a.rent_calc_type || '',
    currency: a.currency || 'USD',
    parking_spaces: a.parking_spaces || 0,
    parking_rate_monthly: a.parking_rate_monthly || 0,
    status: 'Active',
    notes: notesParts.join('\n'),
  };
}

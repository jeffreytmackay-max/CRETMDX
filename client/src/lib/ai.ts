import Anthropic from '@anthropic-ai/sdk';
import type { Lease } from './types';

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
- "renewal_options": renewal/extension options described in plain English (e.g. "One 5-year option at FMV"). "None" if none.
- "notice_period_months": required notice period before expiration as a NUMBER of months. 0 if unknown.
- "detected_language": the primary language of the document (e.g. "English", "Spanish", "Japanese").
- "english_summary": a concise English summary (3-6 sentences) of the lease and its most important obligations and dates.
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
    status: 'Active',
    notes: notesParts.join('\n'),
  };
}

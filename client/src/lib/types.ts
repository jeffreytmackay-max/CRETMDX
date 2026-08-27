export interface Property {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  lat: number;
  lng: number;
  property_type: string;
  rentable_sqft: number;
  status: string;
  ownership: string;
  lease_expiration?: string; // expiration of the current/most-recently-connected lease
  agile_office?: boolean; // coworking / flex space such as Regus or WeWork
  notes?: string;
  custom?: Record<string, unknown>; // user-defined custom fields
  note_log?: NoteEntry[]; // timestamped activity-log entries
}

// A user-defined custom field, applied to a record type (entity).
export type FieldEntity = 'property' | 'lease' | 'transaction';
export type FieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox';
export interface FieldDef {
  id?: number;
  entity: FieldEntity;
  field_key: string;
  label: string;
  field_type: FieldType;
  options?: string; // comma-separated choices for 'select'
  sort_order?: number;
}

export interface Lease {
  id: number;
  property_id: number;
  lease_name: string;
  counterparty: string;
  lease_type: string;
  role: string;
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
  status: string;
  notes?: string;
  // CBRE-style abstract fields
  execution_date?: string;
  rent_start_date?: string;
  duration_months?: number;
  usable_sqft?: number;
  loss_factor?: number;
  building_type?: string;
  property_use?: string;
  lead_broker?: string;
  rent_calc_type?: string;
  currency?: string;
  parking_spaces?: number;
  parking_rate_monthly?: number;
  property_name?: string;
  property_city?: string;
  property_state?: string;
  custom?: Record<string, unknown>; // user-defined custom fields
  insurance?: LeaseInsurance; // certificate-of-insurance requirements & tracking
  note_log?: NoteEntry[]; // timestamped activity-log entries
}

// Insurance requirements + Certificate of Insurance (COI) tracking for a lease.
// Renewed annually per landlord; expiration_date drives the renewal workflow.
export interface LeaseInsurance {
  requirements?: string; // the lease's insurance clause / requirements text
  carrier?: string; // name of the insurance company (insurer)
  additional_insured?: string; // parties named as additional insured
  certificate_holder?: string; // who the certificate is issued to (+ address)
  // Coverage limits ($):
  cgl_each_occurrence?: number; // Commercial General Liability — per occurrence
  cgl_aggregate?: number; // General aggregate
  auto_liability?: number; // Automobile liability (combined single limit)
  umbrella?: number; // Umbrella / excess liability
  employers_liability?: number; // Employer's liability
  workers_comp?: boolean; // Workers' compensation required (statutory)
  property_required?: boolean; // Property / special-form coverage required
  waiver_of_subrogation?: boolean; // Waiver of subrogation required
  primary_noncontributory?: boolean; // Primary & non-contributory required
  // Policy + certificate:
  policy_number?: string;
  effective_date?: string; // policy effective date
  expiration_date?: string; // policy expiration date (annual renewal)
  coi_status?: string; // Not Required / Requested / Pending / On File / Expired
  coi_received_date?: string; // date the current certificate was received
  broker_name?: string; // insurance broker / agent
  broker_contact?: string; // broker email / phone
  notes?: string;
}

export interface Transaction {
  id: number;
  name: string;
  property_id: number | null;
  lease_id?: number | null; // linked lease (e.g. the lease a completed deal produced)
  type: string;
  stage: string;
  market: string;
  target_sqft: number;
  estimated_value: number;
  probability: number;
  broker: string;
  lead: string;
  start_date: string;
  target_close_date: string;
  notes?: string;
  links?: string; // JSON array of { name, url }
  // Internal CRE tracker fields
  space_type?: string; // e.g. NOP, Office, Lab
  progress?: string; // Planning / In Progress / Complete
  date_needed_by?: string;
  priority?: string; // Low / Medium / High
  assigned_to?: string;
  coi_status?: string; // Certificate of Insurance status
  deposit_status?: string; // Security deposit workflow status
  custom?: Record<string, unknown>; // user-defined custom fields
  note_log?: NoteEntry[]; // timestamped activity-log entries
}

// A single dated note in a transaction's activity log.
export interface NoteEntry {
  id: string;
  ts: string; // ISO timestamp of when the note was written
  text: string;
  author?: string; // signed-in user's email, when available
}

export interface DashboardData {
  counts: {
    properties: number;
    leases: number;
    activeLeases: number;
    transactions: number;
  };
  totalSqft: number;
  annualRent: number;
  pipelineValue: number;
  weightedPipeline: number;
  criticalDates: { leaseId: number; leaseName: string; type: string; date: string }[];
  propertiesByType: Record<string, number>;
  propertiesByRegion: Record<string, number>;
  sqftByRegion: Record<string, number>;
}

export interface ScheduleRow {
  year: number;
  baseRent: number;
  opex: number;
  freeRent: number;
  ti: number;
  netCost: number;
}

export interface ComparisonResult {
  lease: {
    rows: ScheduleRow[];
    npv: number;
    totalNetCost: number;
    avgAnnualCost: number;
    effectiveRentPsf: number;
  };
  buy: {
    initial: number;
    rows: { year: number; debtService: number; opex: number; saleProceeds: number; netCost: number }[];
    npv: number;
    totalNetCost: number;
    avgAnnualCost: number;
  };
  recommendation: string;
  npvSavings: number;
}

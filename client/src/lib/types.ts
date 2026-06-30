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
  notes?: string;
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
}

export interface Transaction {
  id: number;
  name: string;
  property_id: number | null;
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

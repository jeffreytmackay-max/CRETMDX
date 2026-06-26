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
  market: string;
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

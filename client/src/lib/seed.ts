import type { Property, Lease, Transaction } from './types';

// TransMedics Real Estate Portfolio (from TMDX_Real_Estate_Portfolio.xlsx).
// Category = Building Type. Coordinates derived from each address. No "Market".

export const SEED_PROPERTIES: Property[] = [
  { id: 1, name: '200 Minuteman Road', address: '200 Minuteman Road', city: 'Andover', state: 'Massachusetts', zip: '01810', country: 'USA', lat: 42.6497, lng: -71.1498, property_type: 'Headquarters', rentable_sqft: 0, status: 'Active' },
  { id: 2, name: '30 Minuteman Road', address: '30 Minuteman Road', city: 'Andover', state: 'Massachusetts', zip: '01810', country: 'USA', lat: 42.6512, lng: -71.1486, property_type: 'Research and Development', rentable_sqft: 0, status: 'Active' },
  { id: 3, name: 'Dallas Hub', address: '3409 Worth Street, Suite 510', city: 'Dallas', state: 'Texas', zip: '75246', country: 'USA', lat: 32.7956, lng: -96.7825, property_type: 'NOP Hub', rentable_sqft: 0, status: 'Active' },
  { id: 4, name: 'Houston Hub', address: '6655 Travis Street, Suite 300', city: 'Houston', state: 'Texas', zip: '77030', country: 'USA', lat: 29.7096, lng: -95.4012, property_type: 'NOP Hub', rentable_sqft: 0, status: 'Active' },
  { id: 5, name: 'Phoenix Hub', address: '7047 E. Greenway Parkway, Suite 250', city: 'Scottsdale', state: 'Arizona', zip: '85254', country: 'USA', lat: 33.6266, lng: -111.9275, property_type: 'NOP Hub', rentable_sqft: 0, status: 'Active' },
  { id: 6, name: 'San Diego Hub', address: '4445 Eastgate Mall, Suite 200', city: 'San Diego', state: 'California', zip: '92121', country: 'USA', lat: 32.8918, lng: -117.212, property_type: 'NOP Hub', rentable_sqft: 0, status: 'Active' },
  { id: 7, name: 'San Ramon Hub', address: '2603 Camino Ramon, Suite 250', city: 'San Ramon', state: 'California', zip: '94583', country: 'USA', lat: 37.7649, lng: -121.9579, property_type: 'NOP Hub', rentable_sqft: 0, status: 'Active' },
  { id: 8, name: 'Seattle Hub', address: '600 Stewart Street, Suite 400', city: 'Seattle', state: 'Washington', zip: '98101', country: 'USA', lat: 47.615, lng: -122.336, property_type: 'NOP Hub', rentable_sqft: 0, status: 'Active' },
  { id: 9, name: 'Denver Hub', address: '4600 South Syracuse, Office 980', city: 'Denver', state: 'Colorado', zip: '80237', country: 'USA', lat: 39.63, lng: -104.899, property_type: 'NOP Hub', rentable_sqft: 0, status: 'Active' },
  { id: 10, name: 'Atlanta Hub', address: '780 Johnson Ferry Road NE, Suite 240', city: 'Sandy Springs', state: 'Georgia', zip: '30342', country: 'USA', lat: 33.9182, lng: -84.3776, property_type: 'NOP Hub', rentable_sqft: 0, status: 'Active' },
  { id: 11, name: 'Cleveland Hub', address: '18051 Jefferson Park Rd, Suite 103 & 104', city: 'Cleveland', state: 'Ohio', zip: '44130', country: 'USA', lat: 41.3722, lng: -81.8129, property_type: 'NOP Hub', rentable_sqft: 0, status: 'Active' },
  { id: 12, name: 'Ann Arbor Hub', address: '2723 S. State St, Suite 150', city: 'Ann Arbor', state: 'Michigan', zip: '48104', country: 'USA', lat: 42.2476, lng: -83.7385, property_type: 'NOP Hub', rentable_sqft: 0, status: 'Active' },
  { id: 13, name: '5 Middlesex', address: '5 Middlesex Ave (Assembly Square Office Park)', city: 'Somerville', state: 'Massachusetts', zip: '02145', country: 'USA', lat: 42.3905, lng: -71.079, property_type: 'Multi-Use', rentable_sqft: 0, status: 'Active' },
  { id: 14, name: 'Chicago Hub', address: '640 N. LaSalle Dr, Suite 280', city: 'Chicago', state: 'Illinois', zip: '60654', country: 'USA', lat: 41.8936, lng: -87.6325, property_type: 'NOP Hub', rentable_sqft: 0, status: 'Active' },
  { id: 15, name: 'St. Paul Hub', address: '510 Tower Road', city: 'St. Paul', state: 'Minnesota', zip: '55107', country: 'USA', lat: 44.933, lng: -93.056, property_type: 'NOP Hub', rentable_sqft: 0, status: 'Active' },
  { id: 16, name: 'Teterboro Hub', address: '380 North Street', city: 'Teterboro', state: 'New Jersey', zip: '07608', country: 'USA', lat: 40.854, lng: -74.062, property_type: 'NOP Hub', rentable_sqft: 0, status: 'Active' },
  { id: 17, name: 'Kansas Hub', address: 'Westwood Plaza Towers', city: 'Westwood', state: 'Kansas', zip: '66205', country: 'USA', lat: 39.0419, lng: -94.6169, property_type: 'NOP Hub', rentable_sqft: 0, status: 'Active' },
  { id: 18, name: 'Tampa Hub', address: '1511 North Westshore Boulevard, Suite 725', city: 'Tampa', state: 'Florida', zip: '33607', country: 'USA', lat: 27.9575, lng: -82.5253, property_type: 'NOP Hub', rentable_sqft: 0, status: 'Active' },
  { id: 19, name: '188 Assembly Park', address: '188 Assembly Park Drive', city: 'Somerville', state: 'Massachusetts', zip: '02145', country: 'USA', lat: 42.3925, lng: -71.0779, property_type: 'Headquarters', rentable_sqft: 498286, status: 'Active', notes: 'Building subtype: Hangar' },
  { id: 20, name: 'Atlantic Aviation SJC', address: 'Norman Y. Mineta San José International Airport', city: 'San Jose', state: 'California', zip: '95110', country: 'USA', lat: 37.3639, lng: -121.9255, property_type: 'Aviation', rentable_sqft: 0, status: 'Active' },
  { id: 21, name: 'Atlantic Aviation RDU', address: 'Raleigh-Durham International Airport', city: 'Morrisville', state: 'North Carolina', zip: '27560', country: 'USA', lat: 35.8779, lng: -78.7875, property_type: 'Aviation', rentable_sqft: 0, status: 'Active' },
  { id: 22, name: 'Signature Flight Support HOU', address: '17250 Chanute Rd', city: 'Houston', state: 'Texas', zip: '77032', country: 'USA', lat: 29.987, lng: -95.337, property_type: 'Aviation', rentable_sqft: 0, status: 'Active' },
  { id: 23, name: 'Signature Flight Support - STP', address: '515 Eaton Street', city: 'St. Paul', state: 'Minnesota', zip: '55107', country: 'USA', lat: 44.9335, lng: -93.059, property_type: 'Aviation', rentable_sqft: 0, status: 'Active' },
  { id: 24, name: 'Aero Center Atlanta PDK', address: '1 Aviation Way', city: 'Atlanta', state: 'Georgia', zip: '30341', country: 'USA', lat: 33.8755, lng: -84.301, property_type: 'Aviation', rentable_sqft: 0, status: 'Active' },
  { id: 25, name: 'Milan NOP', address: 'Viale Monte Santo 1/3', city: 'Milan', state: 'Lombardia', zip: '20124', country: 'Italy', lat: 45.4842, lng: 9.2008, property_type: 'NOP Hub', rentable_sqft: 0, status: 'Active' },
  { id: 26, name: 'Mirandola', address: 'Via Augusto Righi 18-20-28', city: 'Mirandola', state: 'Emilia-Romagna', zip: '41037', country: 'Italy', lat: 44.8873, lng: 11.0654, property_type: 'Multi-Use', rentable_sqft: 0, status: 'Active' },
  { id: 27, name: 'Durham Hub', address: '710 Slater Road', city: 'Morrisville', state: 'North Carolina', zip: '27560', country: 'USA', lat: 35.873, lng: -78.833, property_type: 'NOP Hub', rentable_sqft: 0, status: 'Active' },
  { id: 28, name: 'Los Angeles Hub', address: '6701 Center Drive', city: 'Los Angeles', state: 'California', zip: '90045', country: 'USA', lat: 33.9813, lng: -118.3884, property_type: 'NOP Hub', rentable_sqft: 0, status: 'Active', notes: 'Operator: Regus' },
  { id: 29, name: 'Utrecht Hub', address: 'Yalelaan 40-60, 3584 CM', city: 'Utrecht', state: 'Utrecht', zip: '3584', country: 'Netherlands', lat: 52.0843, lng: 5.1726, property_type: 'NOP Hub', rentable_sqft: 0, status: 'Active' },
  { id: 30, name: 'TransMedics Aviation', address: 'Bozeman Yellowstone International Airport', city: 'Belgrade', state: 'Montana', zip: '59714', country: 'USA', lat: 45.7772, lng: -111.153, property_type: 'Aviation', rentable_sqft: 0, status: 'Active' },
];

const L = (o: Partial<Lease>): Lease =>
  ({
    role: 'Tenant', lease_type: 'Direct', status: 'Active', country: 'USA',
    free_rent_months: 0, ti_allowance_psf: 0, opex_psf: 0, escalation_pct: 3,
    notice_period_months: 9, security_deposit: 0, renewal_options: 'None',
    ...o,
  }) as Lease;

// The TransMedics — 188 Assembly Park lease (from the CBRE abstract), linked to property 19.
export const SEED_LEASES: Lease[] = [
  L({
    id: 1,
    property_id: 19,
    lease_name: 'TransMedics — 188 Assembly Park Dr',
    counterparty: 'BRE-BMR 26 Assembly Innovation I LLC',
    lease_type: 'Direct',
    commencement_date: '2026-01-05',
    expiration_date: '2044-01-31',
    rentable_sqft: 498286,
    base_rent_annual: 1993144,
    escalation_pct: 3,
    opex_psf: 0,
    free_rent_months: 24,
    ti_allowance_psf: 0,
    security_deposit: 17938296,
    renewal_options: 'Two 10-year options at 95% FMV (18-mo notice); plus a one-time 6-month short-term option at 100% of then-current rent',
    notice_period_months: 18,
    execution_date: '2026-01-05',
    rent_start_date: '2028-01-01',
    duration_months: 216,
    building_type: 'Office/Lab',
    property_use: 'Office and laboratory',
    lead_broker: 'John Wilson',
    rent_calc_type: 'Net',
    currency: 'USD',
    parking_spaces: 558,
    parking_rate_monthly: 250,
    notes:
      'Source: CBRE Lease Abstract (TransMedics-MA-Somerville, 2/13/2026).\n\n' +
      'Options & critical events: Fixed purchase option ($362,389,818, exercisable until ~60 days before the 3rd anniversary of the TCD) plus parking purchase ($12,200,000); Right of First Offer to purchase after year 3; two 10-year renewal options at 95% FMV; 6-month short-term extension option; multiple TI design/budget/schedule deadlines and TI Letter-of-Credit step-ups.\n\n' +
      'Clauses: Triple-net — tenant pays its Adjusted Share of Operating Expenses plus a Property Management Fee (monthly OpEx TBD). Security: $17,938,296 letter of credit, reducible after year 4 if market cap > $3B and unrestricted cash > $200M. TI allowance: lease is silent. Parking: 558 Phase-I spaces at $250/space/mo (≤3% annual increases), payable from the Rent Commencement Date regardless of use.\n\n' +
      'Abstractor notes: All dates estimated from an assumed Term Commencement Date of 1/5/2026 and need confirmation; base rent first payable on the Rent Commencement Date (later of 1/1/2028 or 24 months after TCD).',
  }),
];

export const SEED_TRANSACTIONS: Transaction[] = [];

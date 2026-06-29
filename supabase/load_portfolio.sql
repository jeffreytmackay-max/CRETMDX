-- CRETMDX — load the TransMedics portfolio (30 properties + 1 lease).
-- Run ONCE in Supabase → SQL Editor on a FRESH project (after schema.sql).
-- Safe-guard: only inserts if the properties table is currently empty.

do $$
begin
if (select count(*) from public.properties) > 0 then
  raise notice 'properties table is not empty — skipping load to avoid duplicates.';
  return;
end if;

insert into public.properties (name, address, city, state, zip, country, lat, lng, property_type, rentable_sqft, status, ownership, notes) values
('200 Minuteman Road', '200 Minuteman Road', 'Andover', 'Massachusetts', '01810', 'USA', 42.6497, -71.1498, 'Headquarters', 0, 'Active', 'Leased', null),
('30 Minuteman Road', '30 Minuteman Road', 'Andover', 'Massachusetts', '01810', 'USA', 42.6512, -71.1486, 'Research and Development', 0, 'Active', 'Leased', null),
('Dallas Hub', '3409 Worth Street, Suite 510', 'Dallas', 'Texas', '75246', 'USA', 32.7956, -96.7825, 'NOP Hub', 0, 'Active', 'Leased', null),
('Houston Hub', '6655 Travis Street, Suite 300', 'Houston', 'Texas', '77030', 'USA', 29.7096, -95.4012, 'NOP Hub', 0, 'Active', 'Leased', null),
('Phoenix Hub', '7047 E. Greenway Parkway, Suite 250', 'Scottsdale', 'Arizona', '85254', 'USA', 33.6266, -111.9275, 'NOP Hub', 0, 'Active', 'Leased', null),
('San Diego Hub', '4445 Eastgate Mall, Suite 200', 'San Diego', 'California', '92121', 'USA', 32.8918, -117.212, 'NOP Hub', 0, 'Active', 'Leased', null),
('San Ramon Hub', '2603 Camino Ramon, Suite 250', 'San Ramon', 'California', '94583', 'USA', 37.7649, -121.9579, 'NOP Hub', 0, 'Active', 'Leased', null),
('Seattle Hub', '600 Stewart Street, Suite 400', 'Seattle', 'Washington', '98101', 'USA', 47.615, -122.336, 'NOP Hub', 0, 'Active', 'Leased', null),
('Denver Hub', '4600 South Syracuse, Office 980', 'Denver', 'Colorado', '80237', 'USA', 39.63, -104.899, 'NOP Hub', 0, 'Active', 'Leased', null),
('Atlanta Hub', '780 Johnson Ferry Road NE, Suite 240', 'Sandy Springs', 'Georgia', '30342', 'USA', 33.9182, -84.3776, 'NOP Hub', 0, 'Active', 'Leased', null),
('Cleveland Hub', '18051 Jefferson Park Rd, Suite 103 & 104', 'Cleveland', 'Ohio', '44130', 'USA', 41.3722, -81.8129, 'NOP Hub', 0, 'Active', 'Leased', null),
('Ann Arbor Hub', '2723 S. State St, Suite 150', 'Ann Arbor', 'Michigan', '48104', 'USA', 42.2476, -83.7385, 'NOP Hub', 0, 'Active', 'Leased', null),
('5 Middlesex', '5 Middlesex Ave (Assembly Square Office Park)', 'Somerville', 'Massachusetts', '02145', 'USA', 42.3905, -71.079, 'Multi-Use', 0, 'Active', 'Leased', null),
('Chicago Hub', '640 N. LaSalle Dr, Suite 280', 'Chicago', 'Illinois', '60654', 'USA', 41.8936, -87.6325, 'NOP Hub', 0, 'Active', 'Leased', null),
('St. Paul Hub', '510 Tower Road', 'St. Paul', 'Minnesota', '55107', 'USA', 44.933, -93.056, 'NOP Hub', 0, 'Active', 'Leased', null),
('Teterboro Hub', '380 North Street', 'Teterboro', 'New Jersey', '07608', 'USA', 40.854, -74.062, 'NOP Hub', 0, 'Active', 'Leased', null),
('Kansas Hub', 'Westwood Plaza Towers', 'Westwood', 'Kansas', '66205', 'USA', 39.0419, -94.6169, 'NOP Hub', 0, 'Active', 'Leased', null),
('Tampa Hub', '1511 North Westshore Boulevard, Suite 725', 'Tampa', 'Florida', '33607', 'USA', 27.9575, -82.5253, 'NOP Hub', 0, 'Active', 'Leased', null),
('188 Assembly Park', '188 Assembly Park Drive', 'Somerville', 'Massachusetts', '02145', 'USA', 42.3925, -71.0779, 'Headquarters', 498286, 'Active', 'Leased', 'Building subtype: Hangar'),
('Atlantic Aviation SJC', 'Norman Y. Mineta San José International Airport', 'San Jose', 'California', '95110', 'USA', 37.3639, -121.9255, 'Aviation', 0, 'Active', 'Leased', null),
('Atlantic Aviation RDU', 'Raleigh-Durham International Airport', 'Morrisville', 'North Carolina', '27560', 'USA', 35.8779, -78.7875, 'Aviation', 0, 'Active', 'Leased', null),
('Signature Flight Support HOU', '17250 Chanute Rd', 'Houston', 'Texas', '77032', 'USA', 29.987, -95.337, 'Aviation', 0, 'Active', 'Leased', null),
('Signature Flight Support - STP', '515 Eaton Street', 'St. Paul', 'Minnesota', '55107', 'USA', 44.9335, -93.059, 'Aviation', 0, 'Active', 'Leased', null),
('Aero Center Atlanta PDK', '1 Aviation Way', 'Atlanta', 'Georgia', '30341', 'USA', 33.8755, -84.301, 'Aviation', 0, 'Active', 'Leased', null),
('Milan NOP', 'Viale Monte Santo 1/3', 'Milan', 'Lombardia', '20124', 'Italy', 45.4842, 9.2008, 'NOP Hub', 0, 'Active', 'Leased', null),
('Mirandola', 'Via Augusto Righi 18-20-28', 'Mirandola', 'Emilia-Romagna', '41037', 'Italy', 44.8873, 11.0654, 'Multi-Use', 0, 'Active', 'Leased', null),
('Durham Hub', '710 Slater Road', 'Morrisville', 'North Carolina', '27560', 'USA', 35.873, -78.833, 'NOP Hub', 0, 'Active', 'Leased', null),
('Los Angeles Hub', '6701 Center Drive', 'Los Angeles', 'California', '90045', 'USA', 33.9813, -118.3884, 'NOP Hub', 0, 'Active', 'Leased', 'Operator: Regus'),
('Utrecht Hub', 'Yalelaan 40-60, 3584 CM', 'Utrecht', 'Utrecht', '3584', 'Netherlands', 52.0843, 5.1726, 'NOP Hub', 0, 'Active', 'Leased', null),
('TransMedics Aviation', 'Bozeman Yellowstone International Airport', 'Belgrade', 'Montana', '59714', 'USA', 45.7772, -111.153, 'Aviation', 0, 'Active', 'Leased', null);

insert into public.leases (property_id, lease_name, counterparty, lease_type, role, commencement_date, expiration_date, rentable_sqft, base_rent_annual, escalation_pct, opex_psf, free_rent_months, ti_allowance_psf, security_deposit, renewal_options, notice_period_months, status, execution_date, rent_start_date, duration_months, usable_sqft, loss_factor, building_type, property_use, lead_broker, rent_calc_type, currency, parking_spaces, parking_rate_monthly, notes) values
((select id from public.properties where name = '188 Assembly Park' and address = '188 Assembly Park Drive' limit 1), 'TransMedics — 188 Assembly Park Dr', 'BRE-BMR 26 Assembly Innovation I LLC', 'Direct', 'Tenant', '2026-01-05', '2044-01-31', 498286, 1993144, 3, 0, 24, 0, 17938296, 'Two 10-year options at 95% FMV (18-mo notice); plus a one-time 6-month short-term option at 100% of then-current rent', 18, 'Active', '2026-01-05', '2028-01-01', 216, null, null, 'Office/Lab', 'Office and laboratory', 'John Wilson', 'Net', 'USD', 558, 250, 'Source: CBRE Lease Abstract (TransMedics-MA-Somerville, 2/13/2026).

Options & critical events: Fixed purchase option ($362,389,818, exercisable until ~60 days before the 3rd anniversary of the TCD) plus parking purchase ($12,200,000); Right of First Offer to purchase after year 3; two 10-year renewal options at 95% FMV; 6-month short-term extension option; multiple TI design/budget/schedule deadlines and TI Letter-of-Credit step-ups.

Clauses: Triple-net — tenant pays its Adjusted Share of Operating Expenses plus a Property Management Fee (monthly OpEx TBD). Security: $17,938,296 letter of credit, reducible after year 4 if market cap > $3B and unrestricted cash > $200M. TI allowance: lease is silent. Parking: 558 Phase-I spaces at $250/space/mo (≤3% annual increases), payable from the Rent Commencement Date regardless of use.

Abstractor notes: All dates estimated from an assumed Term Commencement Date of 1/5/2026 and need confirmation; base rent first payable on the Rent Commencement Date (later of 1/1/2028 or 24 months after TCD).');

raise notice 'Loaded % properties.', (select count(*) from public.properties);
end $$;

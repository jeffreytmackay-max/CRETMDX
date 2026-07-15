// Country + state/region reference data for consistent, validated dropdowns.

export const COUNTRIES: string[] = [
  'USA', 'Canada', 'Mexico', 'United Kingdom', 'Ireland', 'France', 'Germany',
  'Italy', 'Spain', 'Portugal', 'Netherlands', 'Belgium', 'Luxembourg',
  'Switzerland', 'Austria', 'Denmark', 'Sweden', 'Norway', 'Finland', 'Iceland',
  'Poland', 'Czech Republic', 'Slovakia', 'Hungary', 'Romania', 'Bulgaria',
  'Greece', 'Croatia', 'Slovenia', 'Serbia', 'Ukraine', 'Estonia', 'Latvia',
  'Lithuania', 'Australia', 'New Zealand', 'Japan', 'China', 'Hong Kong',
  'Taiwan', 'South Korea', 'Singapore', 'Malaysia', 'Thailand', 'Vietnam',
  'Philippines', 'Indonesia', 'India', 'Pakistan', 'Israel', 'United Arab Emirates',
  'Saudi Arabia', 'Qatar', 'Turkey', 'Egypt', 'South Africa', 'Nigeria', 'Kenya',
  'Morocco', 'Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru', 'Costa Rica',
  'Panama', 'Other',
];

export const US_STATES: string[] = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'District of Columbia', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
  'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia',
  'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'Puerto Rico',
];

const CA_PROVINCES: string[] = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
  'Newfoundland and Labrador', 'Nova Scotia', 'Ontario', 'Prince Edward Island',
  'Quebec', 'Saskatchewan', 'Northwest Territories', 'Nunavut', 'Yukon',
];

const IT_REGIONS: string[] = [
  'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
  'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche', 'Molise',
  'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana', 'Trentino-Alto Adige',
  'Umbria', "Valle d'Aosta", 'Veneto',
];

const NL_PROVINCES: string[] = [
  'Drenthe', 'Flevoland', 'Friesland', 'Gelderland', 'Groningen', 'Limburg',
  'Noord-Brabant', 'Noord-Holland', 'Overijssel', 'Utrecht', 'Zeeland',
  'Zuid-Holland',
];

// The 16 German federal states (Bundesländer).
const DE_STATES: string[] = [
  'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg',
  'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen', 'Nordrhein-Westfalen',
  'Rheinland-Pfalz', 'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein',
  'Thüringen',
];

const STATES_BY_COUNTRY: Record<string, string[]> = {
  USA: US_STATES,
  Canada: CA_PROVINCES,
  Italy: IT_REGIONS,
  Netherlands: NL_PROVINCES,
  Germany: DE_STATES,
};

// Returns the list of states/regions for a country, or null when we don't have a
// fixed list (the UI then allows free text so international entries still work).
export function statesFor(country?: string): string[] | null {
  return (country && STATES_BY_COUNTRY[country]) || null;
}

// ---- Regional structure ----
// Portfolio-wide regions, derived from each property's country so the grouping
// stays consistent and updates automatically when a country changes.
export const REGIONS: string[] = [
  'North America',
  'South America',
  'Europe',
  'Middle East',
  'Africa',
  'Asia/Pacific',
];

// A few assignments are judgment calls (noted): Mexico + Central America →
// North America; Egypt → Africa; Turkey → Middle East. Adjust here if your
// corporate structure groups them differently.
const REGION_BY_COUNTRY: Record<string, string> = {
  // North America (incl. Central America)
  USA: 'North America',
  Canada: 'North America',
  Mexico: 'North America',
  'Costa Rica': 'North America',
  Panama: 'North America',
  // South America
  Brazil: 'South America',
  Argentina: 'South America',
  Chile: 'South America',
  Colombia: 'South America',
  Peru: 'South America',
  // Europe
  'United Kingdom': 'Europe',
  Ireland: 'Europe',
  France: 'Europe',
  Germany: 'Europe',
  Italy: 'Europe',
  Spain: 'Europe',
  Portugal: 'Europe',
  Netherlands: 'Europe',
  Belgium: 'Europe',
  Luxembourg: 'Europe',
  Switzerland: 'Europe',
  Austria: 'Europe',
  Denmark: 'Europe',
  Sweden: 'Europe',
  Norway: 'Europe',
  Finland: 'Europe',
  Iceland: 'Europe',
  Poland: 'Europe',
  'Czech Republic': 'Europe',
  Slovakia: 'Europe',
  Hungary: 'Europe',
  Romania: 'Europe',
  Bulgaria: 'Europe',
  Greece: 'Europe',
  Croatia: 'Europe',
  Slovenia: 'Europe',
  Serbia: 'Europe',
  Ukraine: 'Europe',
  Estonia: 'Europe',
  Latvia: 'Europe',
  Lithuania: 'Europe',
  // Middle East
  Turkey: 'Middle East',
  Israel: 'Middle East',
  'United Arab Emirates': 'Middle East',
  'Saudi Arabia': 'Middle East',
  Qatar: 'Middle East',
  // Africa
  Egypt: 'Africa',
  'South Africa': 'Africa',
  Nigeria: 'Africa',
  Kenya: 'Africa',
  Morocco: 'Africa',
  // Asia / Pacific
  Australia: 'Asia/Pacific',
  'New Zealand': 'Asia/Pacific',
  Japan: 'Asia/Pacific',
  China: 'Asia/Pacific',
  'Hong Kong': 'Asia/Pacific',
  Taiwan: 'Asia/Pacific',
  'South Korea': 'Asia/Pacific',
  Singapore: 'Asia/Pacific',
  Malaysia: 'Asia/Pacific',
  Thailand: 'Asia/Pacific',
  Vietnam: 'Asia/Pacific',
  Philippines: 'Asia/Pacific',
  Indonesia: 'Asia/Pacific',
  India: 'Asia/Pacific',
  Pakistan: 'Asia/Pacific',
};

// The region for a country, or 'Other' when unmapped/blank.
export function regionForCountry(country?: string): string {
  return (country && REGION_BY_COUNTRY[country]) || 'Other';
}

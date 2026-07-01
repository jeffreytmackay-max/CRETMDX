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

const STATES_BY_COUNTRY: Record<string, string[]> = {
  USA: US_STATES,
  Canada: CA_PROVINCES,
  Italy: IT_REGIONS,
  Netherlands: NL_PROVINCES,
};

// Returns the list of states/regions for a country, or null when we don't have a
// fixed list (the UI then allows free text so international entries still work).
export function statesFor(country?: string): string[] | null {
  return (country && STATES_BY_COUNTRY[country]) || null;
}

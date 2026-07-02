// TransMedics brand palette (from the TMDX Brand & Collateral System v1.0).
export const BRAND = {
  crimson: '#9D2235', // primary
  wine: '#740223', // hover / depth
  rose: '#C45957', // links / tints
  brightRed: '#D50032', // signal
  coral: '#FF7F41',
  peach: '#FFAE81',
  palePeach: '#FFDAB2',
  charcoal: '#302F32', // ink
  slate: '#44414F',
  gray700: '#4D4D50',
  gray500: '#75787B',
  warmGray: '#DAD3D1',
  cream: '#EFECEA',
  success: '#2E7D52',
  info: '#44546A',
};

// Categorical palette for property types / map markers (TransMedics Building Types).
export const PROPERTY_TYPE_COLOR: Record<string, string> = {
  Headquarters: BRAND.crimson,
  'Research and Development': BRAND.rose,
  'NOP Hub': BRAND.info,
  'Multi-Use': BRAND.success,
  Aviation: BRAND.coral,
};

// Categorical palette for the six portfolio regions (+ Other) — map markers,
// legend, and region charts.
export const REGION_COLOR: Record<string, string> = {
  'North America': BRAND.crimson,
  'South America': BRAND.coral,
  Europe: BRAND.info,
  'Middle East': BRAND.peach,
  Africa: BRAND.success,
  'Asia/Pacific': BRAND.rose,
  Other: BRAND.gray500,
};

// Ordered series palette for charts.
export const CHART_SERIES = [
  BRAND.crimson,
  BRAND.coral,
  BRAND.info,
  BRAND.peach,
  BRAND.success,
  BRAND.rose,
];

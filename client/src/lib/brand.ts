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

// Categorical palette for property types / map markers.
export const PROPERTY_TYPE_COLOR: Record<string, string> = {
  Office: BRAND.crimson,
  Retail: BRAND.coral,
  Industrial: BRAND.info,
  Warehouse: BRAND.peach,
  Land: BRAND.success,
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

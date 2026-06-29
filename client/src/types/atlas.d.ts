// The atlas datasets are large TopoJSON blobs; type them as `any` so tsc doesn't
// try to infer a giant literal type from the JSON, and so the untyped
// topojson-client import resolves. We bundle them to render an offline vector
// basemap (country + US state outlines) that works without any tile service.
declare module 'world-atlas/countries-110m.json' {
  const value: any;
  export default value;
}
declare module 'us-atlas/states-10m.json' {
  const value: any;
  export default value;
}
declare module 'topojson-client';

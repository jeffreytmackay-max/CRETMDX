import { GeoJSON } from 'react-leaflet';
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-110m.json';
import us from 'us-atlas/states-10m.json';
import { BRAND } from '../lib/brand';

// An offline vector basemap drawn from bundled TopoJSON: filled country
// landmasses plus US state borders. This renders with zero network requests, so
// the map always shows geography even when external tile services are blocked
// (corporate Wi-Fi, content blockers, iCloud Private Relay) or the device is
// offline. Built once at module load — the data is static.
const countries = feature(world, world.objects.countries) as unknown as object;
const states = feature(us, us.objects.states) as unknown as object;

const landStyle = () => ({
  fillColor: BRAND.warmGray,
  fillOpacity: 1,
  color: '#ffffff',
  weight: 1,
});

const stateStyle = () => ({
  fill: false,
  color: '#C4BAB6',
  weight: 0.6,
});

export function VectorBasemap() {
  return (
    <>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <GeoJSON data={countries as any} interactive={false} style={landStyle} />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <GeoJSON data={states as any} interactive={false} style={stateStyle} />
    </>
  );
}

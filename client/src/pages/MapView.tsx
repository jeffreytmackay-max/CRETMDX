import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Property } from '../lib/types';
import { num } from '../lib/format';
import { Card, Spinner } from '../components/ui';
import { VectorBasemap } from '../components/VectorBasemap';

import { PROPERTY_TYPE_COLOR as TYPE_COLOR } from '../lib/brand';

function markerIcon(color: string) {
  return L.divIcon({
    className: 'cretmdx-marker',
    html: `<span style="
      display:inline-block;width:18px;height:18px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);border:2px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,.4);"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
    popupAnchor: [0, -18],
  });
}

// Leaflet renders gray/blank tiles if its container's size changes after the map
// initializes (common when mounted inside a flex layout, or when the tab/route
// becomes visible). Nudge it to re-measure on mount and on window resize.
function ResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const fix = () => map.invalidateSize();
    const t = setTimeout(fix, 0);
    window.addEventListener('resize', fix);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', fix);
    };
  }, [map]);
  return null;
}

export default function MapView() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('All');
  // The bundled vector basemap always renders. Street tiles are an opt-in
  // enhancement (off by default) because some networks block the tile CDN; we
  // track whether they actually loaded so we can flag it if they don't.
  const [showStreets, setShowStreets] = useState(false);
  const [tilesOk, setTilesOk] = useState(true);

  useEffect(() => {
    api.properties().then((p) => {
      setProperties(p);
      setLoading(false);
    });
  }, []);

  const types = useMemo(
    () => ['All', ...Array.from(new Set(properties.map((p) => p.property_type)))],
    [properties],
  );
  const filtered = properties.filter(
    (p) => typeFilter === 'All' || p.property_type === typeFilter,
  );
  // A marker with a missing/NaN coordinate makes Leaflet throw and blanks the
  // whole map, so only plot sites with valid numeric coordinates. Note that an
  // unset coordinate serializes to null in localStorage (JSON has no NaN), and
  // Number(null) is 0, so guard null/'' explicitly and drop the (0,0) origin.
  const validCoord = (v: unknown) =>
    v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
  const hasCoords = (p: Property) =>
    validCoord(p.lat) && validCoord(p.lng) && !(Number(p.lat) === 0 && Number(p.lng) === 0);
  const mappable = filtered.filter(hasCoords);
  const missing = filtered.length - mappable.length;

  if (loading) return <Spinner label="Loading map…" />;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Location Map</h1>
          <p className="text-sm text-slate-500">
            {mappable.length} of {filtered.length} sites mapped
            {missing > 0 && (
              <span className="text-amber-600">
                {' '}· {missing} hidden (missing coordinates)
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                typeFilter === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
          <button
            onClick={() => {
              setShowStreets((v) => !v);
              setTilesOk(true);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              showStreets ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title="Overlay detailed street map (requires internet; may be blocked on some networks)"
          >
            🛣 Street detail
          </button>
        </div>
      </div>

      <div className="relative flex-1" style={{ minHeight: '60vh' }}>
        <MapContainer center={[39.5, -96]} zoom={4} scrollWheelZoom style={{ height: '100%' }}>
          <ResizeHandler />
          {/* Always-available offline basemap (bundled country + state outlines). */}
          <VectorBasemap />
          {/* Optional online street tiles, layered on top when enabled. */}
          {showStreets && (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemap.cartocdn.com/light_all/{z}/{x}/{y}.png"
              subdomains="abcd"
              maxZoom={19}
              eventHandlers={{
                tileload: () => setTilesOk(true),
                tileerror: () => setTilesOk(false),
              }}
            />
          )}
          {mappable.map((p) => (
            <Marker
              key={p.id}
              position={[Number(p.lat), Number(p.lng)]}
              icon={markerIcon(TYPE_COLOR[p.property_type] || '#75787B')}
            >
              <Popup>
                <div className="min-w-[180px]">
                  <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    {p.address}, {p.city}, {p.state} {p.zip}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <span className="text-slate-500">Type</span>
                    <span className="font-medium">{p.property_type}</span>
                    <span className="text-slate-500">Ownership</span>
                    <span className="font-medium">{p.ownership}</span>
                    <span className="text-slate-500">Sq Ft</span>
                    <span className="font-medium">{num(p.rentable_sqft)}</span>
                    <span className="text-slate-500">Country</span>
                    <span className="font-medium">{p.country}</span>
                    <span className="text-slate-500">Status</span>
                    <span className="font-medium">{p.status}</span>
                  </div>
                  <Link
                    to="/properties"
                    className="mt-2 inline-block text-xs font-medium text-blue-600 hover:underline"
                  >
                    Open in Properties →
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <Card className="absolute bottom-6 left-6 z-[500] p-3">
          <div className="mb-1.5 text-xs font-semibold text-slate-700">Property Type</div>
          <div className="space-y-1">
            {Object.entries(TYPE_COLOR).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2 text-xs text-slate-600">
                <span
                  className="inline-block h-3 w-3 rounded-full border border-white"
                  style={{ background: color }}
                />
                {type}
              </div>
            ))}
          </div>
        </Card>

        {showStreets && !tilesOk && (
          <div className="pointer-events-none absolute left-1/2 top-6 z-[600] w-[min(92%,420px)] -translate-x-1/2">
            <div className="rounded-xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-center text-xs text-amber-800 shadow-sm">
              <div className="font-semibold">Street detail couldn't load</div>
              <div className="mt-0.5">
                The street imagery needs an internet connection and isn't being reached (you may be
                offline or on a network that blocks it). The outline map below still shows every
                site — turn off “Street detail” to hide this.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

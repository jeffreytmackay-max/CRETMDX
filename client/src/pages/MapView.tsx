import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Property } from '../lib/types';
import { num } from '../lib/format';
import { Card, Spinner } from '../components/ui';

const TYPE_COLOR: Record<string, string> = {
  Office: '#2563eb',
  Retail: '#7c3aed',
  Industrial: '#ea580c',
  Warehouse: '#d97706',
  Land: '#65a30d',
};

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

export default function MapView() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('All');

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

  if (loading) return <Spinner label="Loading map…" />;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Location Map</h1>
          <p className="text-sm text-slate-500">{filtered.length} sites across the portfolio</p>
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
        </div>
      </div>

      <div className="relative flex-1">
        <MapContainer center={[39.5, -96]} zoom={4} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filtered.map((p) => (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={markerIcon(TYPE_COLOR[p.property_type] || '#64748b')}
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
                    <span className="text-slate-500">Sq Ft</span>
                    <span className="font-medium">{num(p.rentable_sqft)}</span>
                    <span className="text-slate-500">Market</span>
                    <span className="font-medium">{p.market}</span>
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
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { Property } from '../lib/types';
import { loadGoogleMaps } from '../lib/maps';
import { num } from '../lib/format';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Interactive Google map: street + satellite/hybrid + Street View (Google's own
// controls), with property markers colored by the caller's colorFor and click
// popups. Falls back to an inline error if Google can't load; the parent keeps
// the offline map available as a toggle.
export default function GoogleMapView({
  properties,
  colorFor,
}: {
  properties: Property[];
  colorFor: (p: Property) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const infoRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const fitOnce = useRef(false);
  const [err, setErr] = useState('');
  const [ready, setReady] = useState(false);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !ref.current) return;
        const gmaps = (g as any).maps;
        mapRef.current = new gmaps.Map(ref.current, {
          center: { lat: 39.5, lng: -96 },
          zoom: 4,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          mapTypeId: 'roadmap',
        });
        infoRef.current = new gmaps.InfoWindow();
        setReady(true);
      })
      .catch((e) => setErr(e?.message || 'Failed to load Google Maps.'));
    return () => {
      cancelled = true;
    };
  }, []);

  // (Re)build markers when data or coloring changes; keep the user's view.
  useEffect(() => {
    const w = window as any;
    if (!ready || !mapRef.current || !w.google) return;
    const gmaps = w.google.maps;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    const bounds = new gmaps.LatLngBounds();
    let plotted = false;
    for (const p of properties) {
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) continue;
      const marker = new gmaps.Marker({
        position: { lat, lng },
        map: mapRef.current,
        title: p.name,
        icon: {
          path: gmaps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: colorFor(p),
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
      marker.addListener('click', () => {
        infoRef.current.setContent(popupHtml(p));
        infoRef.current.open({ anchor: marker, map: mapRef.current });
      });
      markersRef.current.push(marker);
      bounds.extend({ lat, lng });
      plotted = true;
    }
    // Fit to the sites only the first time, so recoloring/filtering later doesn't
    // yank the map back and fight the user's zoom/pan.
    if (plotted && !fitOnce.current) {
      try {
        mapRef.current.fitBounds(bounds, 48);
      } catch {
        /* ignore */
      }
      fitOnce.current = true;
    }
  }, [ready, properties, colorFor]);

  if (err) return <div className="p-8 text-center text-sm text-rose-600">{err}</div>;
  return <div ref={ref} className="h-full w-full" />;
}

function esc(s: string): string {
  return (s || '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string,
  );
}

function popupHtml(p: Property): string {
  const addr = [p.address, p.city, p.state, p.zip].filter(Boolean).join(', ');
  return (
    `<div style="min-width:180px;font-family:system-ui,sans-serif">` +
    `<div style="font-weight:600;color:#0f172a">${esc(p.name)}</div>` +
    `<div style="font-size:12px;color:#64748b">${esc(addr)}</div>` +
    `<div style="margin-top:6px;font-size:12px;color:#334155">${esc(p.property_type)} · ${esc(
      p.ownership,
    )} · ${num(p.rentable_sqft || 0)} sf</div>` +
    `<a href="#/properties?expand=${p.id}" style="display:inline-block;margin-top:6px;font-size:12px;color:#2563eb">Open in Properties →</a>` +
    `</div>`
  );
}

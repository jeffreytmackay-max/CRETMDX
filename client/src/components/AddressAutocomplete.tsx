import { useEffect, useRef } from 'react';
import { hasMapsKey, loadGoogleMaps, placeToProperty } from '../lib/maps';
import type { Property } from '../lib/types';

// Address input wired to Google Places Autocomplete. As the user types, Google
// suggests addresses; picking one calls onPick with the parsed fields (address,
// city, state, zip, country, lat/lng). Falls back to a plain input when no Maps
// key is configured, so entry still works.
export default function AddressAutocomplete({
  value,
  onChange,
  onPick,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (fields: Partial<Property>) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  // Keep the latest onPick without re-attaching the listener.
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    if (!hasMapsKey() || !ref.current) return;
    let cancelled = false;
    loadGoogleMaps('places')
      .then((g) => {
        if (cancelled || !ref.current) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const gmaps = (g as any).maps;
        const ac = new gmaps.places.Autocomplete(ref.current, {
          fields: ['address_components', 'geometry', 'formatted_address', 'name'],
          types: ['geocode'],
        });
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (place?.geometry || place?.address_components) pick.current(placeToProperty(place));
        });
      })
      .catch(() => {
        /* leave as a plain input */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    />
  );
}

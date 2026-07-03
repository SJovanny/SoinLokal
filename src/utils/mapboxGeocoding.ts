// ---------------------------------------------------------------------------
// Address geocoding via Mapbox Geocoding API
// https://docs.mapbox.com/api/search/geocoding/
//
// Using Mapbox geocoding keeps the stored GPS coordinates aligned with the
// map tiles (also Mapbox), so pins visually match what Waze / Google Maps
// show for the same address (Apple Maps + BAN were causing 30–100 m offsets
// in Strasbourg).
// ---------------------------------------------------------------------------

import { MAPBOX_TOKEN } from './mapbox';

export interface MapboxGeocodingResult {
  id: string;
  address: string;       // human-readable label (Mapbox "place_name")
  lat: number;
  lng: number;
  placeType?: string;     // "address" | "poi" | "street" ...
}

const API_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

export async function searchAddressMapbox(
  query: string,
): Promise<MapboxGeocodingResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  if (!MAPBOX_TOKEN) {
    console.warn('[MapboxGeocoding] No EXPO_PUBLIC_MAPBOX_API_KEY set');
    return [];
  }

  // country=fr limits to metropolitan + DOM-TOM France.
  // type=address focuses on street-number results (more precise than "street").
  // language=fr returns French labels.
  const url =
    `${API_BASE}/${encodeURIComponent(q)}.json`
    + `?access_token=${encodeURIComponent(MAPBOX_TOKEN)}`
    + `&country=fr&language=fr&limit=5&type=address&autocomplete=true`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn('[MapboxGeocoding] API returned status', res.status);
      return [];
    }

    const data = await res.json();
    const features: any[] = data?.features ?? [];

    return features.map((f) => ({
      id: f.id ?? `${f.center[1]},${f.center[0]}`,
      address: f.place_name ?? f.text ?? q,
      lat: f.center[1],
      lng: f.center[0],
      placeType: Array.isArray(f.place_type) ? f.place_type[0] : undefined,
    }));
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      console.warn('[MapboxGeocoding] Request timed out');
    } else {
      console.warn('[MapboxGeocoding] Fetch error:', err?.message ?? err);
    }
    return [];
  }
}

// ---------------------------------------------------------------------------
// Forward geocode a single free-text address → lat/lng.
// Used by the re-geocoding script for existing patient addresses.
// Returns null when no result or ambiguous.
// ---------------------------------------------------------------------------

export async function geocodeAddressMapbox(
  rawAddress: string,
): Promise<{ lat: number; lng: number } | null> {
  const results = await searchAddressMapbox(rawAddress);
  if (results.length === 0) return null;
  // Mapbox returns most relevant first.
  return { lat: results[0].lat, lng: results[0].lng };
}
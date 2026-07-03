// ---------------------------------------------------------------------------
// Mapbox configuration (runtime token + default style)
// ---------------------------------------------------------------------------

// Public token only — fine for runtime tile/directions/geocoding requests.
// For native SDK download at build time, use a SECRET download token in app.json
// (see QUICK_START.md → "Mapbox secret download token").
export const MAPBOX_TOKEN: string =
  process.env.EXPO_PUBLIC_MAPBOX_API_KEY ?? '';

// Default Mapbox map style (streets, close to Waze / Google Maps look).
export const MAPBOX_STYLE_URL: string =
  'mapbox://styles/mapbox/navigation-day-v1';

// Strasbourg center (used as fallback region before markers are fitted).
export const STRASBOURG_CENTER = {
  latitude: 48.5832,
  longitude: 7.7480,
} as const;

// Bounding box helper: compute south-west & north-east corners from a list
// of coordinates. Used to fit the camera to all markers.
export interface MapCoord {
  latitude: number;
  longitude: number;
}

export function computeBounds(coords: MapCoord[]): {
  ne: [number, number];
  sw: [number, number];
} | null {
  if (coords.length === 0) return null;
  let minLat = coords[0].latitude;
  let maxLat = coords[0].latitude;
  let minLng = coords[0].longitude;
  let maxLng = coords[0].longitude;
  for (const c of coords) {
    if (c.latitude < minLat) minLat = c.latitude;
    if (c.latitude > maxLat) maxLat = c.latitude;
    if (c.longitude < minLng) minLng = c.longitude;
    if (c.longitude > maxLng) maxLng = c.longitude;
  }
  // Add a small padding (≈5%) so single markers aren't edge-glued.
  const latPad = Math.max((maxLat - minLat) * 0.05, 0.002);
  const lngPad = Math.max((maxLng - minLng) * 0.05, 0.002);
  // Mapbox Position format is [longitude, latitude].
  return {
    ne: [maxLng + lngPad, maxLat + latPad],
    sw: [minLng - lngPad, minLat - latPad],
  };
}
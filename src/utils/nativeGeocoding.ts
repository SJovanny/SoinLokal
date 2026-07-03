// ---------------------------------------------------------------------------
// Native geocoding via expo-location
//
// Uses the platform's native geocoder:
//   iOS   → CLGeocoder  (same engine as Apple Maps)
//   Android → Geocoder  (same engine as Google Maps)
//
// This gives coords that perfectly match the native map tiles displayed by
// react-native-maps (Apple Maps on iOS, Google Maps on Android), eliminating
// the 30–100 m offset that BAN geocoding caused.
//
// Note: native geocoding returns coords only (no address label). For address
// search suggestions with labels, we still use BAN or Mapbox geocoding.
// ---------------------------------------------------------------------------

import * as Location from 'expo-location';

export interface NativeGeocodingResult {
  lat: number;
  lng: number;
}

/**
 * Geocode a free-text address using the platform's native geocoder.
 * Returns the first result, or null if no match.
 *
 * iOS:   CLGeocoder → same coords as Apple Maps
 * Android: Geocoder → same coords as Google Maps / Waze
 */
export async function nativeGeocode(address: string): Promise<NativeGeocodingResult | null> {
  const q = address.trim();
  if (q.length < 3) return null;

  try {
    // Request permission if not already granted (needed on some devices).
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[NativeGeocoding] Location permission denied');
      return null;
    }

    const results = await Location.geocodeAsync(q);
    if (!results || results.length === 0) {
      console.warn('[NativeGeocoding] No results for:', q);
      return null;
    }

    const { latitude, longitude } = results[0];
    return { lat: latitude, lng: longitude };
  } catch (err: any) {
    console.warn('[NativeGeocoding] Error:', err?.message ?? err);
    return null;
  }
}
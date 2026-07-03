// ---------------------------------------------------------------------------
// Mapbox configuration (runtime token only — used by JS-side geocoding +
// directions API calls; NOT for native SDK tiles anymore, since we reverted
// to react-native-maps (Apple Maps on iOS, Google Maps on Android) to stay
// compatible with Expo Go.
// ---------------------------------------------------------------------------

// Public token — safe to ship in the app bundle. Used by:
//   src/utils/mapboxGeocoding.ts  (address autocomplete + re-geocoding)
//   src/utils/routing.ts          (Mapbox Directions API)
export const MAPBOX_TOKEN: string =
  process.env.EXPO_PUBLIC_MAPBOX_API_KEY ?? '';

// Strasbourg center (fallback region for the map before markers are fitted).
export const STRASBOURG_CENTER = {
  latitude: 48.5832,
  longitude: 7.7480,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
} as const;
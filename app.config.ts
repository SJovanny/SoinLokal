import type { ExpoConfig } from 'expo/config';

import appJson from './app.json';

// ---------------------------------------------------------------------------
// Dynamic Expo config.
//
// Expo merges this file over app.json. We use it to inject environment-driven
// values that don't belong in source control (e.g. the Mapbox download token
// used by the @rnmapbox/maps config plugin at `expo prebuild` time).
//
// The token lives in .env (loaded automatically by the Expo CLI):
//   EXPO_PUBLIC_MAPBOX_API_KEY=pk.eyJ...   (public token, also used at runtime)
//
// Note: the @rnmapbox/maps plugin reads `RNMapboxMapsDownloadToken` for the
// native SDK download step (CocoaPods on iOS, Gradle on Android). It is
// deprecated in favor of the RNMAPBOX_MAPS_DOWNLOAD_TOKEN env var, but we keep
// it here for clarity — both work equivalently.
// ---------------------------------------------------------------------------

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_API_KEY ?? '';

const config: ExpoConfig = {
  ...(appJson.expo as ExpoConfig),
  plugins: [
    'expo-location',
    'expo-camera',
    'expo-image-picker',
    'expo-splash-screen',
    'expo-font',
    '@react-native-community/datetimepicker',
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsImpl: 'mapbox',
        ...(MAPBOX_TOKEN ? { RNMapboxMapsDownloadToken: MAPBOX_TOKEN } : {}),
      },
    ],
  ],
};

export default config;
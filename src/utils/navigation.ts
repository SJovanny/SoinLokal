// ---------------------------------------------------------------------------
// Open external navigation (Waze or Google Maps) with the user's preferred app.
//
// Flow:
//   - If a preference is stored (AsyncStorage 'nav.pref'), open it directly.
//   - Otherwise show an Alert to pick Waze / Google Maps, then remember.
//
// Used by the "Itinéraire" button on the Ma tournée screen and patient cards.
// ---------------------------------------------------------------------------

import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREF_KEY = 'soinlokal.nav.pref';
type NavPref = 'waze' | 'google';

const WAZE_URL = (lat: number, lng: number) =>
  `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
const GOOGLE_URL = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

async function openApp(pref: NavPref, lat: number, lng: number): Promise<boolean> {
  const url = pref === 'waze' ? WAZE_URL(lat, lng) : GOOGLE_URL(lat, lng);
  try {
    return await Linking.openURL(url);
  } catch {
    return false;
  }
}

export async function openNavigation(
  lat: number,
  lng: number,
): Promise<void> {
  // If user has already picked a navigation app, open it directly.
  const stored = await AsyncStorage.getItem(PREF_KEY);

  if (stored === 'waze' || stored === 'google') {
    const ok = await openApp(stored, lat, lng);
    if (ok) return;
    // If the chosen app isn't installed, fall through to alert.
  }

  Alert.alert(
    'Itinéraire',
    'Ouvrir avec…',
    [
      {
        text: 'Waze',
        onPress: async () => {
          await openApp('waze', lat, lng);
          await AsyncStorage.setItem(PREF_KEY, 'waze');
        },
      },
      {
        text: 'Google Maps',
        onPress: async () => {
          await openApp('google', lat, lng);
          await AsyncStorage.setItem(PREF_KEY, 'google');
        },
      },
      { text: 'Annuler', style: 'cancel' },
    ],
  );
}

// Optionally reset the saved preference (e.g. from a settings screen).
export async function resetNavigationPref(): Promise<void> {
  await AsyncStorage.removeItem(PREF_KEY);
}
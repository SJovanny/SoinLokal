// ---------------------------------------------------------------------------
// Address geocoding via api-adresse.data.gouv.fr (BAN — Base Adresse Nationale)
// Free, covers all French territories including Martinique (DOM-TOM)
// Docs: https://adresse.data.gouv.fr/api-doc/adresse
// ---------------------------------------------------------------------------

export interface GeocodingResult {
  address: string;
  lat: number;
  lng: number;
}

const API_BASE = 'https://api-adresse.data.gouv.fr';

async function fetchAdresseAPI(query: string): Promise<any[]> {
  const url = `${API_BASE}/search/?q=${encodeURIComponent(query)}&limit=5&autocomplete=1`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn('[Geocoding] API returned status', res.status);
      return [];
    }

    const data = await res.json();
    return data?.features ?? [];
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      console.warn('[Geocoding] Request timed out');
    } else {
      console.warn('[Geocoding] Fetch error:', err?.message ?? err);
    }
    return [];
  }
}

export async function searchAddress(query: string): Promise<GeocodingResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  console.log('[Geocoding] Searching:', q);

  const features = await fetchAdresseAPI(q);

  console.log('[Geocoding] Results:', features.length, 'addresses found');

  return features.map((f: any) => ({
    address: f.properties.label,
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
  }));
}

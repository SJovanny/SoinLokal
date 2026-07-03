import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Re-geocode existing patient_profiles addresses using Mapbox Geocoding API.
//
// Why: coords originally stored came from BAN (api-adresse.data.gouv.fr),
// which places points at the street-side entrance / parcel centroid. After
// switching the map to Mapbox tiles, those coords caused a 30–100 m visual
// offset vs Waze/Google. Re-geocoding with Mapbox aligns the stored GPS with
// the map, so pins match what users see in Waze/Google Maps.
//
// Usage:
//   npm run regeocode            # dry-run (prints changes, no DB writes)
//   npm run regeocode -- --write # apply updates to the database
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_API_KEY ?? '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
if (!MAPBOX_TOKEN) {
  console.error('❌ Missing EXPO_PUBLIC_MAPBOX_API_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DO_WRITE = process.argv.includes('--write');

interface PatientProfile {
  profile_id: string;
  address: string | null;
  address_label: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
}

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`
    + `?access_token=${encodeURIComponent(MAPBOX_TOKEN)}`
    + `&country=fr&language=fr&limit=1&type=address`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn(`  ↳ Mapbox returned ${res.status}`);
      return null;
    }
    const data = await res.json();
    const feat = data?.features?.[0];
    if (!feat || !feat.center) return null;
    return { lat: feat.center[1], lng: feat.center[0] };
  } catch (err: any) {
    clearTimeout(timer);
    console.warn(`  ↳ fetch error: ${err?.message ?? err}`);
    return null;
  }
}

async function main() {
  console.log(`\n${DO_WRITE ? '▶ APPLY mode (DB writes enabled)' : '▶ DRY-RUN mode (no writes — pass --write to apply)'}\n`);

  const { data, error } = await supabase
    .from('patient_profiles')
    .select('profile_id, address, address_label, gps_lat, gps_lng');

  if (error) {
    console.error('❌ Fetch error:', error.message);
    process.exit(1);
  }

  const profiles = (data ?? []) as PatientProfile[];
  const withAddress = profiles.filter((p) => (p.address ?? '').trim().length > 0);

  console.log(`Found ${profiles.length} patient profiles, ${withAddress.length} with an address.\n`);

  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (const p of withAddress) {
    const before = p.gps_lat != null && p.gps_lng != null
      ? `${p.gps_lat.toFixed(5)},${p.gps_lng.toFixed(5)}`
      : '∅';

    const coord = await geocode(p.address as string);
    if (!coord) {
      console.warn(`✗ ${p.profile_id}  "${p.address}" → no result`);
      failed++;
      continue;
    }

    const moved =
      p.gps_lat == null ||
      p.gps_lng == null ||
      Math.abs(p.gps_lat - coord.lat) > 1e-6 ||
      Math.abs(p.gps_lng - coord.lng) > 1e-6;

    const after = `${coord.lat.toFixed(5)},${coord.lng.toFixed(5)}`;
    console.log(`${moved ? '↻' : '='} ${p.profile_id}  "${p.address}"\n    ${before} → ${after}`);

    if (!moved) {
      unchanged++;
      continue;
    }

    if (DO_WRITE) {
      const { error: upErr } = await supabase
        .from('patient_profiles')
        .update({ gps_lat: coord.lat, gps_lng: coord.lng })
        .eq('profile_id', p.profile_id);

      if (upErr) {
        console.warn(`  ↳ update failed: ${upErr.message}`);
        failed++;
        continue;
      }
    }
    updated++;
  }

  console.log(`\n--- Summary ---`);
  console.log(`Updated:  ${updated}`);
  console.log(`Unchanged: ${unchanged}`);
  console.log(`Failed:   ${failed}`);
  console.log(`${DO_WRITE ? '' : '(dry-run — re-run with --write to apply)'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
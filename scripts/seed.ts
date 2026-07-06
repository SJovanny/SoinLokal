import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   - EXPO_PUBLIC_SUPABASE_URL (or SUPABASE_URL)');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nAdd them to your .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SeedUser {
  email: string;
  password: string;
  metadata: Record<string, unknown>;
  label: string;
}

// ---------------------------------------------------------------------------
// Seed data — Users
// ---------------------------------------------------------------------------

const SEED_USERS: SeedUser[] = [
  {
    email: 'admin@soinlokal.com',
    password: 'admin123',
    label: 'Nurse (admin)',
    metadata: {
      first_name: 'Marie',
      last_name: 'Dupont',
      user_type: 'nurse',
      phone: '0696000001',
      adeli: '123456789',
      specialties: ['Soins généraux', 'Injections'],
      zone: 'Strasbourg',
      address: '1 Place de la Cathédrale, 67000 Strasbourg',
      gps_lat: 48.581918,
      gps_lng: 7.750252,
      verified: true,
    },
  },
  {
    email: 'famille@soinlokal.com',
    password: 'famille',
    label: 'Famille — Julie Beausoleil',
    metadata: {
      first_name: 'Julie',
      last_name: 'Beausoleil',
      user_type: 'family',
      phone: '0696200001',
    },
  },
  {
    email: 'managed.hugo@soinlokal.local',
    password: 'managed_seed_32chars_abcdef123456',
    label: 'Patient géré — Hugo Francis (par Julie)',
    metadata: {
      first_name: 'Hugo',
      last_name: 'Francis',
      user_type: 'patient',
      phone: '0696300001',
      emergency_contact: '0696300002',
    },
  },
  {
    email: 'patient1@soinlokal.com',
    password: 'patient123',
    label: 'Patient — Lucien Beausoleil',
    metadata: {
      first_name: 'Lucien',
      last_name: 'Beausoleil',
      user_type: 'patient',
      phone: '0696100001',
      emergency_contact: '0696100011',
    },
  },
  {
    email: 'patient2@soinlokal.com',
    password: 'patient123',
    label: 'Patient — Célestine Rivière',
    metadata: {
      first_name: 'Célestine',
      last_name: 'Rivière',
      user_type: 'patient',
      phone: '0696100002',
      emergency_contact: '0696100012',
    },
  },
  {
    email: 'patient3@soinlokal.com',
    password: 'patient123',
    label: 'Patient — Augustin Clément',
    metadata: {
      first_name: 'Augustin',
      last_name: 'Clément',
      user_type: 'patient',
      phone: '0696100003',
      emergency_contact: '0696100013',
    },
  },
  {
    email: 'patient4@soinlokal.com',
    password: 'patient123',
    label: 'Patient — Marie-Anne Fanfan',
    metadata: {
      first_name: 'Marie-Anne',
      last_name: 'Fanfan',
      user_type: 'patient',
      phone: '0696100004',
      emergency_contact: '0696100014',
    },
  },
  {
    email: 'patient5@soinlokal.com',
    password: 'patient123',
    label: 'Patient — Théodore Casimir',
    metadata: {
      first_name: 'Théodore',
      last_name: 'Casimir',
      user_type: 'patient',
      phone: '0696100005',
      emergency_contact: '0696100015',
    },
  },
  {
    email: 'patient6@soinlokal.com',
    password: 'patient123',
    label: 'Patient — Rose Lafontaine',
    metadata: {
      first_name: 'Rose',
      last_name: 'Lafontaine',
      user_type: 'patient',
      phone: '0696100006',
      emergency_contact: '0696100016',
    },
  },
];

// ---------------------------------------------------------------------------
// Geocoding via BAN API (api-adresse.data.gouv.fr)
// ---------------------------------------------------------------------------

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const feature = data?.features?.[0];
    if (!feature) {
      console.warn(`   ⚠️  No geocoding result for: ${address}`);
      return null;
    }
    return { lat: feature.geometry.coordinates[1], lng: feature.geometry.coordinates[0] };
  } catch (err: any) {
    console.warn(`   ⚠️  Geocoding error for ${address}: ${err?.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Patient extra data (DOB, medical notes — GPS will be geocoded from address)
// ---------------------------------------------------------------------------

interface PatientSeed {
  email: string;
  address: string;
  dob: string;
  medical_notes: string;
  allergies: string[];
}

const PATIENT_EXTRAS: PatientSeed[] = [
  {
    email: 'managed.hugo@soinlokal.local',
    address: '5 Rue de la Krutenau, 67000 Strasbourg',
    dob: '1940-06-15',
    medical_notes: 'Arthrose sévère. Difficulté de déplacement. Besoin d\'aide pour les soins quotidiens.',
    allergies: [],
  },
  {
    email: 'patient1@soinlokal.com',
    address: '12 Rue d\'Obernai, 67000 Strasbourg',
    dob: '1945-03-12',
    medical_notes: 'Diabète type 2, hypertension artérielle. Suivi régulier glycémie.',
    allergies: ['Pénicilline'],
  },
  {
    email: 'patient2@soinlokal.com',
    address: '6 Rue Rubens, 67200 Strasbourg',
    dob: '1938-07-25',
    medical_notes: 'Insuffisance cardiaque légère. Pansement chronique jambe gauche.',
    allergies: [],
  },
  {
    email: 'patient3@soinlokal.com',
    address: '1 Rue de Bourgogne, 67100 Strasbourg',
    dob: '1952-11-03',
    medical_notes: 'Post-opératoire prothèse de hanche. Kinésithérapie 2x/semaine.',
    allergies: ['Aspirine', 'Iode'],
  },
  {
    email: 'patient4@soinlokal.com',
    address: 'Königstraße 100, 77694 Kehl, Deutschland',
    dob: '1941-01-18',
    medical_notes: 'Alzheimer débutant. Prise de sang mensuelle (bilan hépatique).',
    allergies: [],
  },
  {
    email: 'patient5@soinlokal.com',
    address: '14 Sent. de l\'Aubépine, 67000 Strasbourg',
    dob: '1955-09-07',
    medical_notes: 'Diabète type 1 insulinodépendant. Contrôle glycémie 3x/semaine.',
    allergies: ['Sulfamides'],
  },
  {
    email: 'patient6@soinlokal.com',
    address: '18 Rue de Barr, 67460 Souffelweyersheim',
    dob: '1933-05-30',
    medical_notes: 'Polyarthrite rhumatoïde. Injection hebdomadaire Méthotrexate.',
    allergies: ['Latex'],
  },
];

// ---------------------------------------------------------------------------
// Seed logic
// ---------------------------------------------------------------------------

async function seedUser(user: SeedUser): Promise<string | null> {
  console.log(`\n→ Creating ${user.label}: ${user.email}`);

  // Check if user already exists
  const { data: existing, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error(`   ❌ Failed to list users: ${listError.message}`);
    return null;
  }

  const alreadyExists = existing.users.find((u) => u.email === user.email);
  if (alreadyExists) {
    console.log(`   ⏭  User already exists (id: ${alreadyExists.id}) — ensuring profile exists.`);
    await ensureProfile(alreadyExists.id, user.email, user.metadata);
    return alreadyExists.id;
  }

  // Create user via Admin API (bypasses email confirmation)
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: user.metadata,
  });

  if (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }

  console.log(`   ✅ Created user ${data.user.id}`);
  return data.user.id;
}

async function ensureProfile(userId: string, email: string, metadata: Record<string, unknown>): Promise<void> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();

  if (existing) {
    console.log(`      Profile already exists.`);
    return;
  }

  console.log(`      Creating missing profile...`);

  // Insert base profile
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    email: email,
    first_name: metadata.first_name as string ?? null,
    last_name: metadata.last_name as string ?? null,
    user_type: metadata.user_type as string ?? null,
    phone: metadata.phone as string ?? null,
    verified: (metadata.verified as boolean) ?? false,
  });

  if (profileError) {
    console.error(`      ❌ Error creating profile: ${profileError.message}`);
    return;
  }

  console.log(`      ✅ Profile created.`);

  // Insert role-specific profile
  if (metadata.user_type === 'nurse') {
    const { error: nurseError } = await supabase.from('nurse_profiles').insert({
      profile_id: userId,
      adeli: metadata.adeli as string ?? null,
      specialties: metadata.specialties as string[] ?? null,
      zone: metadata.zone as string ?? null,
      address: metadata.address as string ?? null,
      gps_lat: metadata.gps_lat as number ?? null,
      gps_lng: metadata.gps_lng as number ?? null,
    });
    if (nurseError) {
      console.error(`      ❌ Error creating nurse_profile: ${nurseError.message}`);
    } else {
      console.log(`      ✅ Nurse profile created.`);
    }
  } else if (metadata.user_type === 'patient') {
    const { error: patientError } = await supabase.from('patient_profiles').insert({
      profile_id: userId,
      address: metadata.address as string ?? null,
      emergency_contact: metadata.emergency_contact as string ?? null,
    });
    if (patientError) {
      console.error(`      ❌ Error creating patient_profile: ${patientError.message}`);
    } else {
      console.log(`      ✅ Patient profile created.`);
    }
  } else if (metadata.user_type === 'family') {
    console.log(`      ✅ Family user — no additional profile needed.`);
  }
}

async function updatePatientProfile(extra: PatientSeed): Promise<void> {
  console.log(`\n→ Updating patient_profiles for ${extra.email}`);

  // Get user id by email
  const { data: existing } = await supabase.auth.admin.listUsers();
  const user = existing?.users.find((u) => u.email === extra.email);
  if (!user) {
    console.error(`   ❌ User ${extra.email} not found`);
    return;
  }

  // Geocode address via BAN API
  console.log(`   📍 Geocoding: ${extra.address}`);
  const coord = await geocodeAddress(extra.address);

  const updateData: any = {
    address: extra.address,
    dob: extra.dob,
    medical_notes: extra.medical_notes,
    allergies: extra.allergies,
  };

  if (coord) {
    updateData.gps_lat = coord.lat;
    updateData.gps_lng = coord.lng;
    console.log(`   📍 GPS: ${coord.lat}, ${coord.lng}`);
  } else {
    console.warn(`   ⚠️  No GPS coordinates for ${extra.address} — pin will not appear on map`);
  }

  const { error } = await supabase
    .from('patient_profiles')
    .update(updateData)
    .eq('profile_id', user.id);

  if (error) {
    console.error(`   ❌ Error updating patient_profiles: ${error.message}`);
    return;
  }

  console.log(`   ✅ Updated patient_profiles`);
}

async function createPatientFile(patientEmail: string, nurseId: string): Promise<void> {
  console.log(`\n→ Creating patient_file for ${patientEmail} → nurse ${nurseId}`);

  // Get patient user id
  const { data: existing } = await supabase.auth.admin.listUsers();
  const patient = existing?.users.find((u) => u.email === patientEmail);
  if (!patient) {
    console.error(`   ❌ Patient ${patientEmail} not found`);
    return;
  }

  // Check if link already exists
  const { data: existingFile } = await supabase
    .from('patient_files')
    .select('id')
    .eq('patient_id', patient.id)
    .eq('nurse_id', nurseId)
    .single();

  if (existingFile) {
    console.log(`   ⏭  Patient file already exists — skipping.`);
    return;
  }

  const { error } = await supabase.from('patient_files').insert({
    patient_id: patient.id,
    nurse_id: nurseId,
    is_active: true,
  });

  if (error) {
    console.error(`   ❌ Error creating patient_file: ${error.message}`);
    return;
  }

  console.log(`   ✅ Created patient_file`);
}

async function clearAppointments(): Promise<void> {
  console.log('\n→ Clearing all appointments');

  const { error } = await supabase
    .from('appointments')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    console.error(`   ❌ Error clearing appointments: ${error.message}`);
    return;
  }

  console.log('   ✅ All appointments deleted');
}

async function createFamilyLink(familyEmail: string, patientEmail: string, permissions: 'read_only' | 'can_message'): Promise<void> {
  console.log(`\n→ Creating family_link: ${familyEmail} → ${patientEmail}`);

  const { data: existing } = await supabase.auth.admin.listUsers();
  const familyUser = existing?.users.find((u) => u.email === familyEmail);
  const patientUser = existing?.users.find((u) => u.email === patientEmail);

  if (!familyUser) {
    console.error(`   ❌ Family user ${familyEmail} not found`);
    return;
  }
  if (!patientUser) {
    console.error(`   ❌ Patient ${patientEmail} not found`);
    return;
  }

  // Get patient_file for this patient
  const { data: patientFile } = await supabase
    .from('patient_files')
    .select('id')
    .eq('patient_id', patientUser.id)
    .limit(1)
    .single();

  if (!patientFile) {
    console.error(`   ❌ No patient_file found for ${patientEmail}`);
    return;
  }

  // Check if link already exists
  const { data: existingLink } = await supabase
    .from('family_links')
    .select('id')
    .eq('family_user_id', familyUser.id)
    .eq('patient_file_id', patientFile.id)
    .single();

  if (existingLink) {
    console.log(`   ⏭  Family link already exists — skipping.`);
    return;
  }

  const { error } = await supabase.from('family_links').insert({
    family_user_id: familyUser.id,
    patient_file_id: patientFile.id,
    permissions,
  });

  if (error) {
    console.error(`   ❌ Error creating family_link: ${error.message}`);
    return;
  }

  console.log(`   ✅ Created family_link (${permissions})`);
}

async function markPatientAsManaged(patientEmail: string, familyEmail: string): Promise<void> {
  console.log(`\n→ Marking ${patientEmail} as managed by ${familyEmail}`);

  const { data: existing } = await supabase.auth.admin.listUsers();
  const patientUser = existing?.users.find((u) => u.email === patientEmail);
  const familyUser = existing?.users.find((u) => u.email === familyEmail);

  if (!patientUser) {
    console.error(`   ❌ Patient ${patientEmail} not found`);
    return;
  }
  if (!familyUser) {
    console.error(`   ❌ Family user ${familyEmail} not found`);
    return;
  }

  const { error } = await supabase
    .from('patient_profiles')
    .update({
      managed_by: familyUser.id,
      is_managed: true,
    })
    .eq('profile_id', patientUser.id);

  if (error) {
    console.error(`   ❌ Error marking as managed: ${error.message}`);
    return;
  }

  console.log(`   ✅ Marked as managed by ${familyEmail}`);
}

async function updateNurseProfile(nurseId: string): Promise<void> {
  console.log(`\n→ Updating nurse_profiles for admin@soinlokal.com`);

  const addresses = [
    {
      id: 'addr-cabinet-001',
      label: 'Cabinet',
      address: '1 Place de la Cathédrale, 67000 Strasbourg',
      gps_lat: 48.581918,
      gps_lng: 7.750252,
      is_primary: true,
    },
  ];

  const { error } = await supabase
    .from('nurse_profiles')
    .update({
      address: '1 Place de la Cathédrale, 67000 Strasbourg',
      gps_lat: 48.581918,
      gps_lng: 7.750252,
      addresses: addresses,
    })
    .eq('profile_id', nurseId);

  if (error) {
    console.error(`   ❌ Error updating nurse_profiles: ${error.message}`);
    return;
  }

  console.log(`   ✅ Updated nurse_profiles (GPS: 48.581918, 7.750252, addresses: ${addresses.length})`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seed(): Promise<void> {
  console.log('🌱 SoinLokal — Seeding database\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);

  // Step 1: Create all users
  const createdIds: Record<string, string> = {};
  for (const user of SEED_USERS) {
    const id = await seedUser(user);
    if (id) createdIds[user.email] = id;
  }

  // Step 1.5: Clear existing appointments
  await clearAppointments();

  // Step 2: Update nurse_profiles with address and GPS
  const nurseId = createdIds['admin@soinlokal.com'];
  if (nurseId) {
    await updateNurseProfile(nurseId);
  }

  // Step 3: Update patient_profiles with GPS, DOB, medical notes
  for (const extra of PATIENT_EXTRAS) {
    await updatePatientProfile(extra);
  }

  // Step 3.5: Mark managed patient (Hugo Francis) as managed by Julie
  await markPatientAsManaged('managed.hugo@soinlokal.local', 'famille@soinlokal.com');

  // Step 4: Link patients to nurse (skip managed patient — nurse will add manually)
  if (nurseId) {
    for (const extra of PATIENT_EXTRAS) {
      if (extra.email.startsWith('managed.')) continue; // managed patients not auto-linked
      await createPatientFile(extra.email, nurseId);
    }
  } else {
    console.error('\n❌ Nurse admin@soinlokal.com not found — cannot create patient_files');
  }

  // Step 5: Create family link (famille@soinlokal.com → patient1)
  await createFamilyLink('famille@soinlokal.com', 'patient1@soinlokal.com', 'can_message');

  // Summary
  console.log('\n─────────────────────────────────────────────');
  console.log('Seeding complete.\n');
  console.log('Login credentials:');
  console.log(`  Nurse:   admin@soinlokal.com / admin123`);
  console.log(`  Famille: famille@soinlokal.com / famille`);
  console.log(`  Patient géré: managed.hugo@soinlokal.local (créé par Julie, visible dans son dashboard)`);
  for (const extra of PATIENT_EXTRAS) {
    if (!extra.email.startsWith('managed.')) {
      console.log(`  Patient: ${extra.email} / patient123`);
    }
  }
  console.log('─────────────────────────────────────────────\n');
}

seed().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

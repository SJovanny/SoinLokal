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

interface PatientExtra {
  email: string;
  address: string;
  dob: string; // YYYY-MM-DD
  gps_lat: number;
  gps_lng: number;
  medical_notes: string;
  allergies: string[];
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
  {
    email: 'patient7@soinlokal.com',
    password: 'patient123',
    label: 'Patient — Firmin Bellevue',
    metadata: {
      first_name: 'Firmin',
      last_name: 'Bellevue',
      user_type: 'patient',
      phone: '0696100007',
      emergency_contact: '0696100017',
    },
  },
  {
    email: 'patient8@soinlokal.com',
    password: 'patient123',
    label: 'Patient — Anaïs Placide',
    metadata: {
      first_name: 'Anaïs',
      last_name: 'Placide',
      user_type: 'patient',
      phone: '0696100008',
      emergency_contact: '0696100018',
    },
  },
];

// ---------------------------------------------------------------------------
// Patient extra data (GPS, DOB, medical notes)
// ---------------------------------------------------------------------------

const PATIENT_EXTRAS: PatientExtra[] = [
  {
    email: 'patient1@soinlokal.com',
    address: '1 Place Kléber, 67000 Strasbourg',
    dob: '1945-03-12',
    gps_lat: 48.583092,
    gps_lng: 7.746501,
    medical_notes: 'Diabète type 2, hypertension artérielle. Suivi régulier glycémie.',
    allergies: ['Pénicilline'],
  },
  {
    email: 'patient2@soinlokal.com',
    address: '10 Rue des Grandes Arcades, 67000 Strasbourg',
    dob: '1938-07-25',
    gps_lat: 48.582821,
    gps_lng: 7.746899,
    medical_notes: 'Insuffisance cardiaque légère. Pansement chronique jambe gauche.',
    allergies: [],
  },
  {
    email: 'patient3@soinlokal.com',
    address: '15 Rue du 22 Novembre, 67000 Strasbourg',
    dob: '1952-11-03',
    gps_lat: 48.582845,
    gps_lng: 7.743109,
    medical_notes: 'Post-opératoire prothèse de hanche. Kinésithérapie 2x/semaine.',
    allergies: ['Aspirine', 'Iode'],
  },
  {
    email: 'patient4@soinlokal.com',
    address: '5 Rue des Orfèvres, 67000 Strasbourg',
    dob: '1941-01-18',
    gps_lat: 48.582738,
    gps_lng: 7.748870,
    medical_notes: 'Alzheimer débutant. Prise de sang mensuelle (bilan hépatique).',
    allergies: [],
  },
  {
    email: 'patient5@soinlokal.com',
    address: '25 Avenue de la Forêt Noire, 67000 Strasbourg',
    dob: '1955-09-07',
    gps_lat: 48.585317,
    gps_lng: 7.767110,
    medical_notes: 'Diabète type 1 insulinodépendant. Contrôle glycémie 3x/semaine.',
    allergies: ['Sulfamides'],
  },
  {
    email: 'patient6@soinlokal.com',
    address: '8 Rue de la Division Leclerc, 67000 Strasbourg',
    dob: '1933-05-30',
    gps_lat: 48.580503,
    gps_lng: 7.746648,
    medical_notes: 'Polyarthrite rhumatoïde. Injection hebdomadaire Méthotrexate.',
    allergies: ['Latex'],
  },
  {
    email: 'patient7@soinlokal.com',
    address: '12 Rue du Faubourg National, 67000 Strasbourg',
    dob: '1948-12-14',
    gps_lat: 48.582599,
    gps_lng: 7.737538,
    medical_notes: 'BPCO (bronchopneumopathie). Oxygénothérapie domiciliaire.',
    allergies: ['Ibuprofène'],
  },
  {
    email: 'patient8@soinlokal.com',
    address: '3 Quai des Pêcheurs, 67000 Strasbourg',
    dob: '1960-04-22',
    gps_lat: 48.582166,
    gps_lng: 7.757071,
    medical_notes: 'Insuffisance rénale chronique. Dialyse péritonéale à domicile.',
    allergies: [],
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
    console.log(`   ⏭  User already exists (id: ${alreadyExists.id}) — skipping.`);
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

async function updatePatientProfile(extra: PatientExtra): Promise<void> {
  console.log(`\n→ Updating patient_profiles for ${extra.email}`);

  // Get user id by email
  const { data: existing } = await supabase.auth.admin.listUsers();
  const user = existing?.users.find((u) => u.email === extra.email);
  if (!user) {
    console.error(`   ❌ User ${extra.email} not found`);
    return;
  }

  const { error } = await supabase
    .from('patient_profiles')
    .update({
      address: extra.address,
      dob: extra.dob,
      gps_lat: extra.gps_lat,
      gps_lng: extra.gps_lng,
      medical_notes: extra.medical_notes,
      allergies: extra.allergies,
    })
    .eq('profile_id', user.id);

  if (error) {
    console.error(`   ❌ Error updating patient_profiles: ${error.message}`);
    return;
  }

  console.log(`   ✅ Updated patient_profiles (GPS: ${extra.gps_lat}, ${extra.gps_lng})`);
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

  // Step 4: Link patients to nurse
  if (nurseId) {
    for (const extra of PATIENT_EXTRAS) {
      await createPatientFile(extra.email, nurseId);
    }
  } else {
    console.error('\n❌ Nurse admin@soinlokal.com not found — cannot create patient_files');
  }

  // Summary
  console.log('\n─────────────────────────────────────────────');
  console.log('Seeding complete.\n');
  console.log('Login credentials:');
  console.log(`  Nurse:   admin@soinlokal.com / admin123`);
  for (const extra of PATIENT_EXTRAS) {
    console.log(`  Patient: ${extra.email} / patient123`);
  }
  console.log('─────────────────────────────────────────────\n');
}

seed().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

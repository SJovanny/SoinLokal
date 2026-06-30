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
// Seed data
// ---------------------------------------------------------------------------

interface SeedUser {
  email: string;
  password: string;
  metadata: Record<string, unknown>;
  label: string;
}

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
      zone: 'Fort-de-France',
      verified: true,
    },
  },
  {
    email: 'patient@soinlokal.com',
    password: 'patient123',
    label: 'Patient',
    metadata: {
      first_name: 'Jean',
      last_name: 'Martin',
      user_type: 'patient',
      phone: '0696000003',
      address: '12 Rue de la Liberté, Fort-de-France',
      emergency_contact: '0696000002',
    },
  },
];

// ---------------------------------------------------------------------------
// Seed logic
// ---------------------------------------------------------------------------

async function seedUser(user: SeedUser): Promise<void> {
  console.log(`\n→ Creating ${user.label}: ${user.email}`);

  // Check if user already exists
  const { data: existing, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error(`   ❌ Failed to list users: ${listError.message}`);
    return;
  }

  const alreadyExists = existing.users.some((u) => u.email === user.email);
  if (alreadyExists) {
    console.log(`   ⏭  User already exists — skipping.`);
    return;
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
    return;
  }

  console.log(`   ✅ Created user ${data.user.id}`);
}

async function seed(): Promise<void> {
  console.log('🌱 SoinLokal — Seeding database\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);

  for (const user of SEED_USERS) {
    await seedUser(user);
  }

  console.log('\n─────────────────────────────────────────────');
  console.log('Seeding complete.\n');
  console.log('Login credentials:');
  for (const user of SEED_USERS) {
    console.log(`  ${user.label}: ${user.email} / ${user.password}`);
  }
  console.log('─────────────────────────────────────────────\n');
}

seed().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

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
// Admin account details
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_FIRST_NAME = 'John';
const ADMIN_LAST_NAME = 'Doe';

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function createAdmin() {
  console.log(`🔧 Creating admin account: ${ADMIN_EMAIL}`);

  // 1. Create auth user
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: ADMIN_FIRST_NAME,
      last_name: ADMIN_LAST_NAME,
      user_type: 'nurse', // required by the handle_new_user trigger
      phone: null,
    },
  });

  if (createError) {
    if (createError.message.includes('already been registered')) {
      console.warn('⚠️  User already exists, updating is_admin flag...');
      const { data: existingUser } = await supabase.auth.admin.listUsers();
      const user = existingUser.users.find((u) => u.email === ADMIN_EMAIL);
      if (!user) {
        console.error('❌ Could not find existing user');
        process.exit(1);
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Error updating profile:', updateError.message);
        process.exit(1);
      }

      console.log(`✅ Admin flag set for existing user: ${ADMIN_EMAIL} (id: ${user.id})`);
      return;
    }

    console.error('❌ Error creating user:', createError.message);
    process.exit(1);
  }

  const userId = newUser.user.id;
  console.log(`✅ Auth user created (id: ${userId})`);

  // 2. Wait for trigger to create profile
  await new Promise((r) => setTimeout(r, 1000));

  // 3. Set is_admin flag
  const { error: adminError } = await supabase
    .from('profiles')
    .update({ is_admin: true })
    .eq('id', userId);

  if (adminError) {
    console.error('❌ Error setting is_admin:', adminError.message);
    process.exit(1);
  }

  console.log(`✅ Admin account ready:`);
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   ID:       ${userId}`);
}

createAdmin();

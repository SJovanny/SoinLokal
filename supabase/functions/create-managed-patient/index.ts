// supabase/functions/create-managed-patient/index.ts
// Edge Function: Create a managed patient (shadow account) for a family member
// Uses service role key to create auth.users entry + profile via database trigger

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateManagedPatientBody {
  first_name: string;
  last_name: string;
  dob?: string;
  address?: string;
  address_label?: string;
  gps_lat?: number;
  gps_lng?: number;
  access_code?: string;
  emergency_contact?: string;
  medical_notes?: string;
  allergies?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generatePassword(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join('');
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  const origin = req.headers.get('origin');

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  // Only POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } },
    );
  }

  try {
    // -----------------------------------------------------------------------
    // 1. Parse body
    // -----------------------------------------------------------------------
    const body: CreateManagedPatientBody = await req.json();

    if (!body.first_name?.trim() || !body.last_name?.trim()) {
      return new Response(
        JSON.stringify({ error: 'first_name et last_name sont obligatoires' }),
        { status: 400, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } },
      );
    }

    if (!body.address?.trim()) {
      return new Response(
        JSON.stringify({ error: 'address est obligatoire' }),
        { status: 400, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } },
      );
    }

    // -----------------------------------------------------------------------
    // 2. Supabase client with auth (caller's JWT)
    // -----------------------------------------------------------------------
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for auth.admin operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // -----------------------------------------------------------------------
    // 3. Verify caller is authenticated and is a family member
    // -----------------------------------------------------------------------
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_type')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.user_type !== 'family') {
      return new Response(
        JSON.stringify({ error: 'Seuls les comptes famille peuvent créer un patient géré' }),
        { status: 403, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } },
      );
    }

    // -----------------------------------------------------------------------
    // 3b. Check if family member already has a managed patient
    // -----------------------------------------------------------------------
    const { data: existingManaged } = await supabaseAdmin
      .from('patient_profiles')
      .select('profile_id')
      .eq('managed_by', user.id)
      .eq('is_managed', true)
      .limit(1);

    if (existingManaged && existingManaged.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Vous avez déjà un proche associé. Un compte famille ne peut être lié qu\'à un seul patient.' }),
        { status: 409, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } },
      );
    }

    // -----------------------------------------------------------------------
    // 4. Generate shadow credentials
    // -----------------------------------------------------------------------
    const managedUuid = crypto.randomUUID();
    const managedEmail = `managed.${managedUuid}@soinlokal.local`;
    const managedPassword = generatePassword();

    // -----------------------------------------------------------------------
    // 5. Create auth user (admin, no email confirmation)
    // -----------------------------------------------------------------------
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: managedEmail,
      password: managedPassword,
      email_confirm: true,
      user_metadata: {
        first_name: body.first_name.trim(),
        last_name: body.last_name.trim(),
        user_type: 'patient',
        phone: null,
        address: body.address?.trim() ?? null,
        emergency_contact: body.emergency_contact?.trim() ?? null,
      },
    });

    if (createError || !newUser?.user) {
      console.error('[create-managed-patient] createUser error:', createError?.message);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la création du compte patient" }),
        { status: 500, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } },
      );
    }

    const patientUserId = newUser.user.id;

    // -----------------------------------------------------------------------
    // 6. Wait for trigger to create profile + patient_profiles, then update
    //    The handle_new_user trigger fires on INSERT to auth.users and creates
    //    both profile and patient_profiles rows synchronously, but we add a
    //    small delay to be safe.
    // -----------------------------------------------------------------------

    // Wait a tiny bit for the trigger
    await new Promise((r) => setTimeout(r, 500));

    // Update patient_profiles with managed_by and additional data
    const updateData: Record<string, unknown> = {
      managed_by: user.id,
      is_managed: true,
      address: body.address?.trim() ?? null,
    };

    if (body.dob) updateData.dob = body.dob;
    if (body.address_label) updateData.address_label = body.address_label.trim();
    if (body.access_code) updateData.access_code = body.access_code.trim();
    if (body.emergency_contact) updateData.emergency_contact = body.emergency_contact.trim();
    if (body.medical_notes) updateData.medical_notes = body.medical_notes.trim();
    if (body.allergies && body.allergies.length > 0) {
      updateData.allergies = body.allergies;
    }
    if (body.gps_lat != null) updateData.gps_lat = body.gps_lat;
    if (body.gps_lng != null) updateData.gps_lng = body.gps_lng;

    const { error: updateError } = await supabaseAdmin
      .from('patient_profiles')
      .update(updateData)
      .eq('profile_id', patientUserId);

    if (updateError) {
      console.error('[create-managed-patient] patient_profiles update error:', updateError.message);
      // Non-fatal: the user is created, just without extra data
    }

    // -----------------------------------------------------------------------
    // 7. Create family_link (can_message)
    // -----------------------------------------------------------------------

    // First we need to get or create a patient_file. But per the plan, the nurse
    // creates the patient_file when they add the patient to their list. So we
    // cannot create a family_link yet because it requires a patient_file_id.
    //
    // Instead: we create a placeholder patient_file with nurse_id = NULL? No,
    // patient_files.nurse_id is NOT NULL.
    //
    // Solution: we skip the family_link creation here. The family_link will be
    // created by the nurse when they add the patient, OR we need to update the
    // FamilyDashboard to show managed patients even without a patient_file.
    //
    // Actually, looking at FamilyDashboard, it fetches data via family_links →
    // patient_files. If there's no family_link, the patient won't appear.
    //
    // Better approach: FamilyDashboard should ALSO fetch patients where
    // patient_profiles.managed_by = user.id (direct ownership, not via family_links).
    //
    // For now: return the patient_id. The FamilyDashboard will be updated to
    // query managed_by directly.

    // -----------------------------------------------------------------------
    // 8. Return success
    // -----------------------------------------------------------------------
    return new Response(
      JSON.stringify({
        patient_id: patientUserId,
        patient_name: `${body.first_name.trim()} ${body.last_name.trim()}`,
        message: 'Patient géré créé avec succès',
      }),
      {
        status: 200,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('[create-managed-patient] unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } },
    );
  }
});

// supabase/functions/verify-rpps/index.ts
// Edge Function: Verify a nurse's RPPS number against the ANS "Annuaire Santé"
// FHIR API (free, real-time). Called from the client BEFORE the Supabase Auth
// account is created (no session available yet), so this function does not
// require the caller to be authenticated. It only performs a read-only lookup
// against a public government registry and validates basic input format.
//
// Env secrets required (set via `supabase secrets set`):
//   ANS_RPPS_API_URL  - base URL of the ANS FHIR "Annuaire Santé" API
//   ANS_RPPS_API_KEY  - API key obtained from portail-api.esante.gouv.fr

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VerifyRppsBody {
  rppsNumber: string;
}

type VerificationStatus = 'verified' | 'not_found' | 'inactive' | 'not_a_nurse' | 'error';

interface VerifyRppsResponse {
  status: VerificationStatus;
  profession?: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Diploma codes corresponding to "Infirmier(ère)" professions (DE09 = DE Infirmier)
const NURSE_DIPLOMA_CODES = [
  'DE09', // DE Infirmier
  'DE10', // DE Infirmier psychiatrique
  'DE19', // DE Infirmier de bloc opératoire
  'DE20', // DE Infirmier anesthésiste
  'DE21', // DE Infirmier puériculteur
  'DE22', // DE Cadre de santé
  'DE23', // DE IPA pathologies chroniques stabilisées
  'DE24', // DE IPA oncologie et hémato-oncologie
  'DE25', // DE IPA maladie rénale
  'DE26', // DE IPA santé mentale
  'DE27', // DE IPA urgences
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function jsonResponse(body: VerifyRppsResponse, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// ANS FHIR Annuaire Santé lookup
// ---------------------------------------------------------------------------

async function lookupRpps(rppsNumber: string): Promise<Response> {
  const apiUrl = Deno.env.get('ANS_RPPS_API_URL');
  const apiKey = Deno.env.get('ANS_RPPS_API_KEY');

  if (!apiUrl || !apiKey) {
    throw new Error('ANS_RPPS_API_URL / ANS_RPPS_API_KEY not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `${apiUrl}/Practitioner?identifier=${encodeURIComponent(rppsNumber)}`;
    console.log('[verify-rpps] Calling ANS API:', url);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'ESANTE-API-KEY': apiKey,
        Accept: 'application/fhir+json',
      },
      signal: controller.signal,
    });

    console.log('[verify-rpps] ANS API response status:', res.status);
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ status: 'error', message: 'Method not allowed' }, 405, origin);
  }

  let body: VerifyRppsBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ status: 'error', message: 'Corps de requête invalide' }, 400, origin);
  }

  const rppsNumber = (body.rppsNumber ?? '').replace(/\s/g, '');
  console.log('[verify-rpps] Received request for RPPS:', rppsNumber);

  // -------------------------------------------------------------------------
  // Basic format validation (11 digits — RPPS format since Oct 2021)
  // -------------------------------------------------------------------------
  if (!/^\d{11}$/.test(rppsNumber)) {
    console.warn('[verify-rpps] Invalid RPPS format:', rppsNumber);
    return jsonResponse(
      { status: 'error', message: 'Le numéro RPPS doit contenir 11 chiffres' },
      400,
      origin,
    );
  }

  // -------------------------------------------------------------------------
  // Call ANS FHIR API
  // -------------------------------------------------------------------------
  try {
    const res = await lookupRpps(rppsNumber);

    if (!res.ok) {
      console.warn('[verify-rpps] ANS API non-OK response:', res.status);
      return jsonResponse(
        { status: 'error', message: "Impossible de contacter l'Annuaire Santé pour le moment" },
        200,
        origin,
      );
    }

    const bundle = await res.json();
    const entries: unknown[] = Array.isArray(bundle?.entry) ? bundle.entry : [];
    console.log('[verify-rpps] Bundle entries count:', entries.length);

    if (entries.length === 0) {
      console.log('[verify-rpps] No practitioner found for RPPS:', rppsNumber);
      return jsonResponse(
        { status: 'not_found', message: 'Aucun professionnel trouvé avec ce numéro RPPS' },
        200,
        origin,
      );
    }

    // deno-lint-ignore no-explicit-any
    const practitioner: any = (entries[0] as any).resource ?? entries[0];
    console.log('[verify-rpps] Practitioner found, id:', practitioner?.id);
    console.log('[verify-rpps] Active:', practitioner?.active);

    // -------------------------------------------------------------------------
    // Check active status
    // -------------------------------------------------------------------------
    const isActive = practitioner?.active !== false;

    if (!isActive) {
      console.log('[verify-rpps] Practitioner is inactive, RPPS:', rppsNumber);
      return jsonResponse(
        { status: 'inactive', message: "Ce numéro RPPS n'est plus actif" },
        200,
        origin,
      );
    }

    // -------------------------------------------------------------------------
    // Check nurse profession via diploma codes
    // -------------------------------------------------------------------------
    const qualificationCodes: string[] = (practitioner?.qualification ?? [])
      .flatMap((q: any) => q.code?.coding ?? [])
      .map((c: any) => c.code as string);

    console.log('[verify-rpps] Qualification codes:', qualificationCodes);

    const isNurse = qualificationCodes.some((code) => NURSE_DIPLOMA_CODES.includes(code));

    if (!isNurse) {
      console.log('[verify-rpps] Not a nurse profession for RPPS:', rppsNumber, 'codes:', qualificationCodes);
      return jsonResponse(
        {
          status: 'not_a_nurse',
          message: "Ce numéro RPPS ne correspond pas à un(e) infirmier(ère). Seuls les numéros de professionnels infirmiers sont acceptés sur SoinLokal.",
        },
        200,
        origin,
      );
    }

    // -------------------------------------------------------------------------
    // Extract profession display name
    // -------------------------------------------------------------------------
    const professionDisplay =
      practitioner?.qualification
        ?.flatMap((q: any) => q.code?.coding ?? [])
        .find((c: any) => c.system?.includes('TRE_R48'))?.display
      ?? 'Infirmier(ère)';

    console.log('[verify-rpps] Verification successful, profession:', professionDisplay);

    return jsonResponse(
      {
        status: 'verified',
        profession: professionDisplay,
        message: 'Numéro RPPS vérifié avec succès',
      },
      200,
      origin,
    );
  } catch (err) {
    console.error('[verify-rpps] Lookup failed:', err);
    return jsonResponse(
      { status: 'error', message: "Vérification automatique indisponible" },
      200,
      origin,
    );
  }
});

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { NurseProfile } from '../types';

interface AnsVerificationResult {
  status: string;
  profession?: string;
  message: string;
}

const DOC_LABELS: Record<string, { label: string; icon: string; column: string }> = {
  cni: { label: "Carte d'identité", icon: '🪪', column: 'cni_path' },
  domicile: { label: 'Justificatif de domicile', icon: '🏠', column: 'justificatif_domicile_path' },
  carte_pro: { label: 'Carte professionnelle (CPS)', icon: '👩‍⚕️', column: 'carte_pro_path' },
};

export default function VerificationDetailPage() {
  const { profileId } = useParams<{ profileId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [nurseProfile, setNurseProfile] = useState<NurseProfile | null>(null);
  const [documentUrls, setDocumentUrls] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [notes, setNotes] = useState('');
  const [decision, setDecision] = useState<'idle' | 'approved' | 'rejected'>('idle');

  // ANS verification state
  const [ansLoading, setAnsLoading] = useState(false);
  const [ansResult, setAnsResult] = useState<AnsVerificationResult | null>(null);

  useEffect(() => {
    if (!profileId) return;

    const load = async () => {
      const { data: nurse, error } = await supabase
        .from('nurse_profiles')
        .select('profile_id, rpps_number, verification_status, verified_at, specialties, zone, cni_path, justificatif_domicile_path, carte_pro_path, profiles(id, first_name, last_name, email, created_at)')
        .eq('profile_id', profileId)
        .single<NurseProfile>();

      if (error || !nurse) {
        navigate('/', { replace: true });
        return;
      }

      setNurseProfile(nurse);

      // Load signed URLs for documents
      const urls: Record<string, string | null> = {};
      for (const [key, doc] of Object.entries(DOC_LABELS)) {
        const path = (nurse as any)[doc.column];
        if (path) {
          const { data: signed } = await supabase.storage
            .from('nurse-documents')
            .createSignedUrl(path, 3600);
          urls[key] = signed?.signedUrl ?? null;
        } else {
          urls[key] = null;
        }
      }
      setDocumentUrls(urls);
      setLoading(false);
    };

    load();
  }, [profileId, navigate]);

  // -------------------------------------------------------------------------
  // ANS API verification
  // -------------------------------------------------------------------------

  const handleVerifyRpps = async () => {
    if (!nurseProfile?.rpps_number) return;
    setAnsLoading(true);
    setAnsResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('verify-rpps', {
        body: { rppsNumber: nurseProfile.rpps_number },
      });

      if (error) {
        setAnsResult({ status: 'error', message: "Impossible de contacter l'API ANS" });
      } else {
        setAnsResult({
          status: data?.status ?? 'unknown',
          profession: data?.profession,
          message: data?.message ?? 'Pas de message',
        });
      }
    } catch {
      setAnsResult({ status: 'error', message: 'Erreur réseau' });
    } finally {
      setAnsLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Approve / Reject
  // -------------------------------------------------------------------------

  const handleDecision = async (approve: boolean) => {
    if (!nurseProfile || !user) return;
    setProcessing(true);

    if (approve) {
      const { error: nurseError } = await supabase
        .from('nurse_profiles')
        .update({
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
        })
        .eq('profile_id', nurseProfile.profile_id);
      if (nurseError) {
        setProcessing(false);
        return;
      }

      await supabase
        .from('profiles')
        .update({ verified: true })
        .eq('id', nurseProfile.profile_id);
    } else {
      const { error: nurseError } = await supabase
        .from('nurse_profiles')
        .update({
          verification_status: 'rejected',
          verified_at: null,
        })
        .eq('profile_id', nurseProfile.profile_id);
      if (nurseError) {
        setProcessing(false);
        return;
      }
    }

    setDecision(approve ? 'approved' : 'rejected');
    setProcessing(false);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (decision !== 'idle') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="text-5xl">{decision === 'approved' ? '✅' : '❌'}</span>
        <h2 className="mt-4 text-xl font-bold text-gray-900">
          {decision === 'approved' ? 'Infirmière validée' : 'Demande rejetée'}
        </h2>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="mt-6 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Retour à la file
        </button>
      </div>
    );
  }

  const profile = nurseProfile?.profiles;

  return (
    <div>
      <button
        onClick={() => navigate('/')}
        className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700"
      >
        ← Retour
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: info + actions */}
        <div className="space-y-4 lg:col-span-1">
          {/* Nurse info */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-lg font-bold text-gray-900">
              {profile?.first_name} {profile?.last_name}
            </h3>
            <p className="text-sm text-gray-500">{profile?.email}</p>

            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-400">Numéro RPPS</p>
                <p className="text-sm font-semibold text-gray-900">{nurseProfile?.rpps_number ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400">Statut</p>
                <span
                  className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    nurseProfile?.verification_status === 'verified'
                      ? 'bg-emerald-100 text-emerald-700'
                      : nurseProfile?.verification_status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : nurseProfile?.verification_status === 'pending_review'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {nurseProfile?.verification_status === 'pending_docs'
                    ? 'En attente de documents'
                    : nurseProfile?.verification_status === 'pending_review'
                    ? 'En attente de validation'
                    : nurseProfile?.verification_status ?? '—'}
                </span>
              </div>
              {nurseProfile?.zone && (
                <div>
                  <p className="text-xs font-medium text-gray-400">Zone</p>
                  <p className="text-sm text-gray-900">{nurseProfile.zone}</p>
                </div>
              )}
              {nurseProfile?.specialties && nurseProfile.specialties.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400">Spécialités</p>
                  <p className="text-sm text-gray-900">{nurseProfile.specialties.join(', ')}</p>
                </div>
              )}
            </div>
          </div>

          {/* ANS Verification */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h4 className="mb-3 text-sm font-semibold text-gray-800">Vérification RPPS (API ANS)</h4>

            <button
              onClick={handleVerifyRpps}
              disabled={ansLoading || !nurseProfile?.rpps_number}
              className="mb-3 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ansLoading ? 'Vérification...' : 'Vérifier sur l\'annuaire ANS'}
            </button>

            {ansResult && (
              <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-sm">
                <p>
                  <span className="font-medium text-gray-600">Statut :</span>{' '}
                  {ansResult.status === 'verified' ? (
                    <span className="text-emerald-700 font-semibold">✅ Vérifié</span>
                  ) : ansResult.status === 'not_found' ? (
                    <span className="text-red-700 font-semibold">❌ Introuvable</span>
                  ) : ansResult.status === 'inactive' ? (
                    <span className="text-red-700 font-semibold">❌ Inactif</span>
                  ) : ansResult.status === 'not_a_nurse' ? (
                    <span className="text-red-700 font-semibold">❌ Pas infirmier(ère)</span>
                  ) : (
                    <span className="text-gray-700">{ansResult.status}</span>
                  )}
                </p>
                {ansResult.profession && (
                  <p>
                    <span className="font-medium text-gray-600">Profession :</span>{' '}
                    <span className="text-gray-900">{ansResult.profession}</span>
                  </p>
                )}
                <p>
                  <span className="font-medium text-gray-600">Message :</span>{' '}
                  <span className="text-gray-700">{ansResult.message}</span>
                </p>
              </div>
            )}

            <p className="mt-3 text-xs text-gray-400">
              Pour vérifier le nom du praticien, consultez{' '}
              <a
                href="https://annuaire.esante.gouv.fr/search"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 underline hover:text-emerald-700"
              >
                l'annuaire ANS
              </a>{' '}
              avec le numéro RPPS ci-dessus.
            </p>
          </div>

          {/* Notes + Actions */}
          {nurseProfile?.verification_status === 'pending_review' && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <label className="mb-2 block text-sm font-medium text-gray-700">Notes (optionnel)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Ajouter une note..."
              />

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => handleDecision(false)}
                  disabled={processing}
                  className="flex-1 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Rejeter
                </button>
                <button
                  onClick={() => handleDecision(true)}
                  disabled={processing}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing ? 'En cours...' : 'Valider'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: documents */}
        <div className="space-y-4 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-800">Documents</h3>

          {Object.entries(DOC_LABELS).map(([key, doc]) => {
            const url = documentUrls[key];
            return (
              <div key={key} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-lg">{doc.icon}</span>
                  <h4 className="text-sm font-semibold text-gray-700">{doc.label}</h4>
                </div>
                {url ? (
                  <img
                    src={url}
                    alt={doc.label}
                    className="max-h-[400px] w-full rounded-lg object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-12">
                    <span className="text-2xl">📄</span>
                    <p className="mt-2 text-sm text-gray-400">Non soumis</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

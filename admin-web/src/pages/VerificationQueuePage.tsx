import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { NurseProfile } from '../types';

export default function VerificationQueuePage() {
  const [pendingDocs, setPendingDocs] = useState<NurseProfile[]>([]);
  const [pendingReview, setPendingReview] = useState<NurseProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const { data: docsData } = await supabase
      .from('nurse_profiles')
      .select('profile_id, rpps_number, verification_status, profiles(id, first_name, last_name, email, created_at)')
      .eq('verification_status', 'pending_docs')
      .order('created_at', { referencedTable: 'profiles', ascending: false });

    const { data: reviewData } = await supabase
      .from('nurse_profiles')
      .select('profile_id, rpps_number, verification_status, cni_path, justificatif_domicile_path, carte_pro_path, profiles(id, first_name, last_name, email, created_at)')
      .eq('verification_status', 'pending_review')
      .order('created_at', { referencedTable: 'profiles', ascending: false });

    setPendingDocs((docsData as unknown as NurseProfile[]) ?? []);
    setPendingReview((reviewData as unknown as NurseProfile[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dossiers de vérification</h2>
          <p className="text-sm text-gray-500">
            {pendingDocs.length + pendingReview.length} dossier{(pendingDocs.length + pendingReview.length) !== 1 ? 's' : ''} en attente
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
        >
          Actualiser
        </button>
      </div>

      {/* Section 1: En attente de documents */}
      <DossierSection
        title="En attente de documents"
        count={pendingDocs.length}
        color="amber"
        items={pendingDocs}
        emptyText="Aucun dossier en attente de documents"
        renderExtra={(item) => (
          <div className="mt-1.5 text-xs text-gray-400">
            Inscrit{item.profiles?.last_name?.endsWith('e') ? 'e' : ''} le {item.profiles?.created_at ? new Date(item.profiles.created_at).toLocaleDateString('fr-FR') : '—'}
          </div>
        )}
      />

      {/* Section 2: En attente de validation */}
      <DossierSection
        title="En attente de validation"
        count={pendingReview.length}
        color="blue"
        items={pendingReview}
        emptyText="Aucun dossier en attente de validation"
        renderExtra={(item) => {
          const docs = [
            { label: 'CNI', ok: !!item.cni_path },
            { label: 'Domicile', ok: !!item.justificatif_domicile_path },
            { label: 'Carte pro', ok: !!item.carte_pro_path },
          ];
          return (
            <div className="mt-2 flex flex-wrap gap-2">
              {docs.map((d) => (
                <span
                  key={d.label}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    d.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {d.ok ? '✓' : '—'} {d.label}
                </span>
              ))}
            </div>
          );
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// DossierSection — reusable section component
// ---------------------------------------------------------------------------

interface DossierSectionProps {
  title: string;
  count: number;
  color: 'amber' | 'blue';
  items: NurseProfile[];
  emptyText: string;
  renderExtra: (item: NurseProfile) => React.ReactNode;
}

function DossierSection({ title, count, color, items, emptyText, renderExtra }: DossierSectionProps) {
  const borderColor = color === 'amber' ? 'border-amber-200' : 'border-blue-200';
  const bgColor = color === 'amber' ? 'bg-amber-50' : 'bg-blue-50';
  const badgeBg = color === 'amber' ? 'bg-amber-100' : 'bg-blue-100';
  const badgeText = color === 'amber' ? 'text-amber-700' : 'text-blue-700';
  const accentBg = color === 'amber' ? 'bg-amber-500' : 'bg-blue-500';

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <div className={`h-4 w-1 rounded-full ${accentBg}`} />
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <span className={`inline-block rounded-full ${badgeBg} px-2 py-0.5 text-xs font-bold ${badgeText}`}>
          {count}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="ml-5 text-sm text-gray-400 italic">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const p = item.profiles;
            return (
              <Link
                key={item.profile_id}
                to={`/verification/${item.profile_id}`}
                className={`block rounded-xl border ${borderColor} ${bgColor} p-5 transition-all hover:shadow-md`}
              >
                {/* Header: name + badge */}
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <p className="text-base font-bold text-gray-900">
                      {p?.first_name} {p?.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{p?.email}</p>
                  </div>
                  <span className="text-gray-400">→</span>
                </div>

                {/* Info */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                  <span>
                    <span className="text-gray-400">RPPS :</span> {item.rpps_number ?? '—'}
                  </span>
                </div>

                {/* Extra content (date or document status) */}
                {renderExtra(item)}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

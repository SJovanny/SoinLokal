-- ==============================================================================
-- Script pour vider la base de données SoinLokal
-- À exécuter dans l'éditeur SQL de Supabase
-- ATTENTION : Supprime toutes les données de manière irréversible !
-- ==============================================================================

-- 1. Supprimer les données dans l'ordre des dépendances (enfants d'abord)
DELETE FROM public.messages;
DELETE FROM public.family_links;
DELETE FROM public.appointments;
DELETE FROM public.patient_files;
DELETE FROM public.patient_profiles;
DELETE FROM public.nurse_profiles;
DELETE FROM public.profiles;

-- 2. Supprimer les utilisateurs Auth (nécessite service role)
-- Cette partie doit être exécutée via l'API Admin de Supabase
-- ou manuellement depuis le dashboard Authentication > Users

-- Alternative : exécuter ce bloc pour supprimer les profils orphelins
-- (les users Auth restent mais les profils sont nettoyés)
DO $$
BEGIN
  RAISE NOTICE '✅ Toutes les données publiques ont été supprimées.';
  RAISE NOTICE '⚠️  Les utilisateurs Auth doivent être supprimés manuellement depuis le dashboard Supabase > Authentication > Users.';
END $$;

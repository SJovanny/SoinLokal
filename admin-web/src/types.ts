export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'patient' | 'family' | 'nurse';
  verified: boolean;
  is_admin: boolean;
}

export interface NurseProfile {
  profile_id: string;
  rpps_number: string | null;
  verification_status: 'pending_docs' | 'pending_review' | 'pending' | 'verified' | 'manual_review' | 'rejected' | null;
  rejection_note: string | null;
  verified_at: string | null;
  specialties: string[] | null;
  zone: string | null;
  cni_path: string | null;
  justificatif_domicile_path: string | null;
  carte_pro_path: string | null;
  profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    created_at: string;
  } | null;
}

export interface VerificationRequest {
  id: string;
  profile_id: string;
  document_path: string | null;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

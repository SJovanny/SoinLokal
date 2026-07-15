import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Environment variables (Expo SDK 56 uses EXPO_PUBLIC_ prefix)
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[SoinLokal] EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY is not defined. ' +
      'Make sure your .env file is configured correctly.',
  );
}

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage:           AsyncStorage,
    autoRefreshToken:  true,
    persistSession:    true,
    detectSessionInUrl: false,
  },
});

// ---------------------------------------------------------------------------
// Database types
// ---------------------------------------------------------------------------

export interface Profile {
  id:          string;
  email:       string;
  first_name:  string;
  last_name:   string;
  user_type:   'patient' | 'family' | 'nurse';
  phone?:      string;
  photo_url?:  string;
  avatar_type: 'photo' | 'generated' | null;
  avatar_seed?: string;
  verified:    boolean;
  is_admin?:   boolean;
  created_at:  string;
  updated_at:  string;
}

export interface NurseAddress {
  id:         string;
  label:      string; // e.g. "Cabinet", "Domicile", "Résidence secondaire"
  address:    string;
  gps_lat:    number | null;
  gps_lng:    number | null;
  is_primary: boolean;
}

export interface NurseProfile {
  id:                  string;
  profile_id:          string;
  adeli?:              string;
  rpps_number?:        string;
  verification_status?: 'pending_docs' | 'pending_review' | 'pending' | 'verified' | 'manual_review' | 'rejected';
  verified_at?:        string;
  specialties?:        string[];
  zone?:               string;
  cni_path?:           string;
  justificatif_domicile_path?: string;
  carte_pro_path?:     string;
  address?:            string;
  gps_lat?:            number;
  gps_lng?:            number;
  addresses?:          NurseAddress[];
  bio?:                string;
  rating:              number;
  total_patients:      number;
  total_visits:        number;
  created_at:          string;
  updated_at:          string;
}

export interface NurseVerificationRequest {
  id:            string;
  profile_id:    string;
  document_path?: string;
  status:        'pending' | 'approved' | 'rejected';
  notes?:        string;
  reviewed_by?:  string;
  reviewed_at?:  string;
  created_at:    string;
  updated_at:    string;
}

export interface PatientProfile {
  id:                string;
  profile_id:        string;
  dob?:              string;
  address?:          string;
  address_label?:    string;
  gps_lat?:          number;
  gps_lng?:          number;
  access_code?:      string;
  emergency_contact?: string;
  medical_notes?:    string;
  allergies?:        string[];
  created_at:        string;
  updated_at:        string;
}

export interface PatientFile {
  id:              string;
  patient_id:      string;
  nurse_id:        string;
  prescription?:   string;
  care_plan?:      string;
  is_active:       boolean;
  created_at:      string;
  updated_at:      string;
}

export interface Appointment {
  id:                  string;
  patient_file_id:     string;
  nurse_id:            string;
  date:                string;
  time:                string | null;
  care_type:           string;
  duration_min:        number;
  status:              'pending' | 'confirmed' | 'completed' | 'cancelled';
  address?:            string;
  notes?:              string;
  completion_note?:    string;
  care_performed?:     string;
  observations?:       string;
  remarks?:            string;
  visible_to_patient:  boolean;
  created_at:          string;
  updated_at:          string;
  nurse?:              { id: string; first_name: string; last_name: string };
}

export interface FamilyLink {
  id:                string;
  family_user_id:    string;
  patient_file_id:   string;
  permissions:       'read_only' | 'can_message';
  created_at:        string;
}

export interface Message {
  id:                string;
  author_id:         string;
  patient_file_id:   string;
  content:           string;
  is_read:           boolean;
  created_at:        string;
}

export interface NurseCareType {
  id:                string;
  nurse_id:          string;
  name:              string;
  created_at:        string;
}

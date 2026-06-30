import React, { createContext, useContext, useEffect, useState } from 'react';
import { type Session, type User, type AuthError } from '@supabase/supabase-js';

import { supabase, type Profile, type NurseProfile, type PatientProfile } from '../utils/supabase';
import { debugLog } from '../utils/devConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegisterProfileInput {
  firstName:        string;
  lastName:         string;
  userType:         'patient' | 'family' | 'nurse';
  phone?:           string;
  adeli?:           string;
  specialties?:     string[];
  zone?:            string;
  address?:         string;
  emergencyContact?: string;
  verified?:        boolean;
}

export interface AuthContextType {
  user:             User | null;
  userProfile:      Profile | null;
  nurseProfile:     NurseProfile | null;
  patientProfile:   PatientProfile | null;
  loading:          boolean;
  login:            (email: string, password: string) => Promise<{ data: unknown; error: AuthError | null }>;
  register:         (email: string, password: string, profile: RegisterProfileInput) => Promise<{ data: unknown; error: AuthError | null }>;
  logout:           () => Promise<void>;
  resetPassword:    (email: string) => Promise<{ data: unknown; error: AuthError | null }>;
  fetchProfile:     (userId: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [user, setUser]               = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [nurseProfile, setNurseProfile] = useState<NurseProfile | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading]         = useState<boolean>(true);

  // -------------------------------------------------------------------------
  // Bootstrap — restore session and subscribe to auth state changes
  // -------------------------------------------------------------------------

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        setUser(session.user);
        fetchProfile(session.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session: Session | null) => {
      if (!mounted) return;
      if (session) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // -------------------------------------------------------------------------
  // Profile fetcher
  // -------------------------------------------------------------------------

  const fetchProfile = async (userId: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single<Profile>();

      if (error) {
        debugLog('Error fetching profile', error.message);
        return;
      }

      if (data) {
        setUserProfile(data);

        // Fetch role-specific profile
        if (data.user_type === 'nurse') {
          const { data: nurse } = await supabase
            .from('nurse_profiles')
            .select('*')
            .eq('profile_id', userId)
            .single<NurseProfile>();
          setNurseProfile(nurse ?? null);
          setPatientProfile(null);
        } else if (data.user_type === 'patient') {
          const { data: patient } = await supabase
            .from('patient_profiles')
            .select('*')
            .eq('profile_id', userId)
            .single<PatientProfile>();
          setPatientProfile(patient ?? null);
          setNurseProfile(null);
        } else {
          setNurseProfile(null);
          setPatientProfile(null);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      debugLog('Unexpected error fetching profile', message);
    }
  };

  // -------------------------------------------------------------------------
  // Auth actions
  // -------------------------------------------------------------------------

  const login = async (
    email: string,
    password: string,
  ): Promise<{ data: unknown; error: AuthError | null }> => {
    try {
      debugLog('Connexion Supabase', { email });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      debugLog('Erreur de connexion', message);
      throw err;
    }
  };

  const register = async (
    email: string,
    password: string,
    profile: RegisterProfileInput,
  ): Promise<{ data: unknown; error: AuthError | null }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name:        profile.firstName,
            last_name:         profile.lastName,
            user_type:         profile.userType,
            phone:             profile.phone ?? null,
            adeli:             profile.adeli ?? null,
            specialties:       profile.specialties ?? null,
            zone:              profile.zone ?? null,
            address:           profile.address ?? null,
            emergency_contact: profile.emergencyContact ?? null,
            verified:          profile.verified ?? false,
          },
        },
      });

      if (error) throw error;
      // Profile creation is handled by a Supabase database trigger.
      return { data, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      debugLog("Erreur d'inscription", message);
      throw err;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      debugLog('Début de la déconnexion');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      debugLog('Erreur lors de la déconnexion', message);
      // Force local state clear even if signOut call fails
      setUser(null);
      setUserProfile(null);
      setNurseProfile(null);
      setPatientProfile(null);
      setLoading(false);
      throw err;
    }
  };

  const resetPassword = async (
    email: string,
  ): Promise<{ data: unknown; error: AuthError | null }> => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'soinlokal://reset-password',
      });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      debugLog('Erreur mdp oublié', message);
      throw err;
    }
  };

  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------

  const value: AuthContextType = {
    user,
    userProfile,
    nurseProfile,
    patientProfile,
    loading,
    login,
    register,
    logout,
    resetPassword,
    fetchProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

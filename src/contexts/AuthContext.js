import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

import { DEV_CONFIG, debugLog, DEBUG_MESSAGES } from '../utils/devConfig';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        debugLog('Error fetching profile', error.message);
        return;
      }

      if (data) {
        setUserProfile(data);
      }
    } catch (error) {
      debugLog('Unexpected error fetching profile', error.message);
    }
  };

  const login = async (email, password) => {
    try {
      // Vérifier d'abord les utilisateurs de test (seulement en développement)
      // Connexion Supabase drecte


      // Si ce n'est pas un utilisateur de test, utiliser Supabase
      debugLog('Connexion Supabase', { email });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error };
    } catch (error) {
      debugLog('Erreur de connexion', error.message);
      throw error;
    }
  };

  const register = async (email, password, profile) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: profile.firstName,
            last_name: profile.lastName,
            user_type: profile.userType,
            phone: profile.phone,
            adeli: profile.adeli || null,
            specialties: profile.specialties || null,
            zone: profile.zone || null,
            address: profile.address || null,
            emergency_contact: profile.emergencyContact || null,
            verified: profile.verified || false
          }
        }
      });

      if (error) throw error;

      // La création du profil est maintenant gérée par un Trigger Supabase
      // Pas besoin d'insertion manuelle ici

      return { data, error };
    } catch (error) {
      debugLog('Erreur d\'inscription', error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      debugLog('Début de la déconnexion');



      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      debugLog('Erreur lors de la déconnexion', error.message);
      setUser(null);
      setUserProfile(null);
      setLoading(false);
      throw error;
    }
  };

  const resetPassword = async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'soinlokal://reset-password',
      });
      if (error) throw error;
      return { data, error };
    } catch (error) {
      debugLog('Erreur mdp oublié', error.message);
      throw error;
    }
  };

  const value = {
    user,
    userProfile,
    login,
    register,
    logout,
    resetPassword,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

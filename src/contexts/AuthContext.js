import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { validateTestCredentials } from '../utils/testUsers';
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Récupérer le profil utilisateur depuis Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      // Vérifier d'abord les utilisateurs de test (seulement en développement)
      if (DEV_CONFIG.ENABLE_TEST_ACCOUNTS) {
        const testUser = validateTestCredentials(email, password);

        if (testUser) {
          debugLog(DEBUG_MESSAGES.TEST_USER_LOGIN, testUser.profile);
          
          // Simuler une connexion réussie avec un utilisateur de test
          const mockUser = {
            uid: testUser.profile.uid,
            email: testUser.email,
            emailVerified: true,
            isTestUser: true
          };
          
          setUser(mockUser);
          setUserProfile(testUser.profile);
          return { user: mockUser };
        }
      }

      // Si ce n'est pas un utilisateur de test, utiliser Firebase
      debugLog(DEBUG_MESSAGES.FIREBASE_LOGIN, { email });
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential;
    } catch (error) {
      debugLog('Erreur de connexion', error.message);
      throw error;
    }
  };

  const register = async (email, password, profile) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Créer le profil utilisateur dans Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        ...profile,
        email,
        createdAt: new Date().toISOString(),
        uid: userCredential.user.uid
      });

      return userCredential;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      debugLog('Début de la déconnexion');
      
      // Vérifier si c'est un utilisateur de test
      if (user && user.isTestUser) {
        debugLog('Déconnexion utilisateur de test');
        // Pour les utilisateurs de test, simplement réinitialiser l'état
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }
      
      // Sinon, utiliser Firebase
      debugLog('Déconnexion Firebase');
      await signOut(auth);
      // Firebase se chargera automatiquement de mettre à jour l'état via onAuthStateChanged
    } catch (error) {
      debugLog('Erreur lors de la déconnexion', error.message);
      // En cas d'erreur, forcer la réinitialisation de l'état
      setUser(null);
      setUserProfile(null);
      setLoading(false);
      throw error;
    }
  };

  const value = {
    user,
    userProfile,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Configuration pour les fonctionnalités de développement
 * SoinLokal - Application mobile pour infirmières libérales
 */

// Détection de l'environnement de développement
export const IS_DEVELOPMENT = __DEV__;

// Configuration des comptes de test
export const DEV_CONFIG = {
  // Activer les comptes de test
  ENABLE_TEST_ACCOUNTS: IS_DEVELOPMENT,
  
  // Afficher les informations de debug
  SHOW_DEBUG_INFO: IS_DEVELOPMENT,
  
  // Activer les logs de debug
  ENABLE_DEBUG_LOGS: IS_DEVELOPMENT,
  
  // Ignorer la vérification SSL (dev uniquement)
  IGNORE_SSL: IS_DEVELOPMENT,
  
  // Utiliser les données de test au lieu de Firebase
  USE_MOCK_DATA: false,
  
  // Délai artificiel pour simuler la latence réseau (ms)
  NETWORK_DELAY: 0,
  
  // Activer le mode offline pour les tests
  OFFLINE_MODE: false,
};

// Configuration Firebase pour le développement
export const FIREBASE_DEV_CONFIG = {
  // Utiliser l'émulateur Firebase local
  USE_EMULATOR: false,
  
  // URL de l'émulateur
  EMULATOR_HOST: 'localhost',
  EMULATOR_AUTH_PORT: 9099,
  EMULATOR_FIRESTORE_PORT: 8080,
  EMULATOR_STORAGE_PORT: 9199,
};

// Messages de debug
export const DEBUG_MESSAGES = {
  TEST_USER_LOGIN: '🧪 Connexion avec un compte de test',
  FIREBASE_LOGIN: '🔥 Connexion Firebase',
  MOCK_DATA_LOADED: '📦 Données simulées chargées',
  OFFLINE_MODE: '📡 Mode hors ligne activé',
};

// Fonction utilitaire pour les logs de debug
export const debugLog = (message, data = null) => {
  if (DEV_CONFIG.ENABLE_DEBUG_LOGS) {
    console.log(`[SoinLokal Debug] ${message}`, data || '');
  }
};

// Fonction pour afficher les alertes de développement
export const devAlert = (title, message) => {
  if (IS_DEVELOPMENT) {
    console.warn(`[DEV ALERT] ${title}: ${message}`);
  }
};

// Configuration des couleurs pour le développement
export const DEV_COLORS = {
  TEST_USER: '#4ade80',
  FIREBASE_USER: '#f59e0b',
  DEBUG_OVERLAY: 'rgba(0, 0, 0, 0.8)',
  WARNING: '#ef4444',
  INFO: '#3b82f6',
};

export default DEV_CONFIG;

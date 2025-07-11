// Configuration Firebase pour SoinLokal
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration Firebase (à remplacer par vos vraies clés)
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "soinlokal-app.firebaseapp.com",
  projectId: "soinlokal-app",
  storageBucket: "soinlokal-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser Auth avec AsyncStorage pour la persistance
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialiser les autres services
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

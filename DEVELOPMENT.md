# Guide de développement - SoinLokal

## 🏗️ Architecture du projet

### Structure des dossiers

```
src/
├── components/          # Composants UI réutilisables
│   ├── common/         # Composants génériques (Button, Input, etc.)
│   ├── forms/          # Composants de formulaire
│   ├── cards/          # Composants de cartes
│   └── modals/         # Composants modales
├── screens/            # Écrans de l'application
│   ├── auth/           # Écrans d'authentification
│   ├── nurse/          # Écrans interface infirmière
│   ├── patient/        # Écrans interface patient
│   └── shared/         # Écrans partagés
├── navigation/         # Configuration de navigation
├── services/           # Services et API
│   ├── firebase.js     # Configuration Firebase
│   ├── api.js          # Appels API
│   └── storage.js      # Gestion du stockage local
├── contexts/           # Contextes React
│   ├── AuthContext.js  # Contexte d'authentification
│   └── ThemeContext.js # Contexte de thème
├── utils/             # Utilitaires et helpers
│   ├── constants.js    # Constantes globales
│   ├── helpers.js      # Fonctions utilitaires
│   └── validation.js   # Validation des données
└── hooks/             # Hooks personnalisés
    ├── useAuth.js      # Hook d'authentification
    ├── useLocation.js  # Hook de géolocalisation
    └── useFirestore.js # Hook Firestore
```

## 🔧 Configuration Firebase

### 1. Créer un projet Firebase

1. Aller sur [Firebase Console](https://console.firebase.google.com)
2. Créer un nouveau projet "SoinLokal"
3. Activer Google Analytics (optionnel)

### 2. Configurer l'authentification

```javascript
// Dans Firebase Console > Authentication > Sign-in method
// Activer : Email/Password
```

### 3. Configurer Firestore

```javascript
// Structure de la base de données
users/ {
  userId: {
    userType: 'nurse' | 'patient',
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    verified: boolean,
    createdAt: timestamp,
    // Champs spécifiques infirmière
    adeli?: string,
    specialties?: string[],
    zone?: string,
    // Champs spécifiques patient
    address?: string,
    emergencyContact?: string
  }
}

patients/ {
  patientId: {
    userId: string, // Référence vers users
    nurseId: string, // Référence vers users (infirmière)
    medicalInfo: {
      conditions: string[],
      medications: string[],
      allergies: string[]
    },
    address: {
      street: string,
      city: string,
      postalCode: string,
      coordinates: {
        latitude: number,
        longitude: number
      }
    },
    createdAt: timestamp
  }
}

appointments/ {
  appointmentId: {
    nurseId: string,
    patientId: string,
    date: timestamp,
    time: string,
    type: string,
    status: 'pending' | 'completed' | 'cancelled',
    notes?: string,
    duration?: number,
    createdAt: timestamp
  }
}

care_records/ {
  recordId: {
    appointmentId: string,
    nurseId: string,
    patientId: string,
    careType: string,
    description: string,
    photos?: string[], // URLs des images
    signature?: string, // Signature du patient
    completedAt: timestamp
  }
}

messages/ {
  messageId: {
    senderId: string,
    receiverId: string,
    content: string,
    type: 'text' | 'image' | 'document',
    read: boolean,
    createdAt: timestamp
  }
}
```

### 4. Règles de sécurité Firestore

```javascript
// Rules pour Firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Règles pour les utilisateurs
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Règles pour les patients
    match /patients/{patientId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         request.auth.uid == resource.data.nurseId);
    }
    
    // Règles pour les rendez-vous
    match /appointments/{appointmentId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == resource.data.nurseId || 
         request.auth.uid == resource.data.patientId);
    }
    
    // Règles pour les messages
    match /messages/{messageId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == resource.data.senderId || 
         request.auth.uid == resource.data.receiverId);
    }
  }
}
```

## 🎨 Conventions de style

### Couleurs

```javascript
// Utiliser les constantes définies dans utils/constants.js
import { COLORS } from '../utils/constants';

// Exemple d'utilisation
const styles = StyleSheet.create({
  nurseButton: {
    backgroundColor: COLORS.NURSE_PRIMARY,
  },
  patientButton: {
    backgroundColor: COLORS.PATIENT_PRIMARY,
  },
});
```

### Composants

```javascript
// Utiliser des composants fonctionnels avec hooks
import React, { useState, useEffect } from 'react';

const MyComponent = ({ prop1, prop2 }) => {
  const [state, setState] = useState(initialValue);
  
  useEffect(() => {
    // Logique d'effet
  }, []);
  
  return (
    <View>
      {/* JSX */}
    </View>
  );
};

export default MyComponent;
```

## 📱 Développement mobile

### Tests sur appareils

```bash
# Démarrer Expo
npm start

# Scanner le QR code avec :
# - Expo Go (iOS/Android)
# - Caméra native (iOS)

# Ou utiliser les simulateurs
npm run ios     # iOS Simulator (macOS uniquement)
npm run android # Android Emulator
```

### Géolocalisation

```javascript
import * as Location from 'expo-location';

// Demander les permissions
const { status } = await Location.requestForegroundPermissionsAsync();

// Obtenir la position
const location = await Location.getCurrentPositionAsync({});
```

### Caméra et photos

```javascript
import * as ImagePicker from 'expo-image-picker';

// Prendre une photo
const result = await ImagePicker.launchCameraAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  aspect: [4, 3],
  quality: 1,
});
```

## 🔍 Debugging

### Outils de développement

```javascript
// Afficher les logs
console.log('Debug message');

// Utiliser Flipper pour React Native
// Remote debugging avec Chrome DevTools
```

### Erreurs communes

1. **Erreur de navigation** : Vérifier que les écrans sont bien enregistrés
2. **Firebase non initialisé** : Vérifier la configuration dans firebase.js
3. **Permissions manquantes** : Demander les permissions avant d'utiliser les API

## 📦 Déploiement

### Build de production

```bash
# Android
expo build:android

# iOS (macOS requis)
expo build:ios

# Web
expo build:web
```

### Publication

```bash
# Publier sur Expo
expo publish

# Déployer sur les stores
# Utiliser EAS Build pour les builds optimisés
```

## 🧪 Tests

### Tests unitaires

```bash
# Installer Jest (déjà inclus avec Expo)
npm install --save-dev jest

# Lancer les tests
npm test
```

### Tests d'intégration

```bash
# Installer Detox pour les tests E2E
npm install --save-dev detox
```

## 📋 Checklist de développement

- [ ] Respecter la structure des dossiers
- [ ] Utiliser les constantes de couleurs
- [ ] Gérer les erreurs Firebase
- [ ] Tester sur plusieurs appareils
- [ ] Vérifier les permissions
- [ ] Optimiser les performances
- [ ] Documenter les fonctions complexes
- [ ] Suivre les conventions de nommage

## 🚀 Optimisations

### Performance

- Utiliser `FlatList` pour les listes longues
- Implémenter la pagination
- Optimiser les images avec `react-native-fast-image`
- Utiliser `React.memo` pour les composants lourds

### Sécurité

- Valider toutes les entrées utilisateur
- Utiliser HTTPS pour toutes les communications
- Chiffrer les données sensibles
- Implémenter la déconnexion automatique

---

**Dernière mise à jour :** Janvier 2025

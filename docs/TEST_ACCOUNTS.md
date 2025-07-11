# Comptes de Test - SoinLokal

Ce document décrit les comptes de test disponibles pour le développement et les tests de l'application SoinLokal.

## 🎯 Objectif

Les comptes de test permettent de :
- Tester l'application sans configuration Firebase
- Accéder rapidement aux différents types d'utilisateurs
- Démonstrations et présentations
- Tests fonctionnels rapides

## 👥 Comptes Disponibles

### 1. Infirmière Administratrice
- **Email** : `admin@soinlokal.com`
- **Mot de passe** : `admin`
- **Type** : Infirmière
- **Fonctionnalités** : Accès complet aux outils infirmière
  - Tableau de bord infirmière
  - Gestion des patients
  - Planification des tournées
  - Messagerie professionnelle
  - Profil et paramètres

### 2. Patient Standard
- **Email** : `patient@soinlokal.com`
- **Mot de passe** : `patient`
- **Type** : Patient
- **Fonctionnalités** : Interface patient complète
  - Tableau de bord patient
  - Historique des soins
  - Communication avec l'infirmière
  - Informations médicales

### 3. Membre de Famille
- **Email** : `famille@soinlokal.com`
- **Mot de passe** : `famille`
- **Type** : Famille/Proche
- **Fonctionnalités** : Suivi d'un proche
  - Accès aux informations du patient lié
  - Notifications importantes
  - Communication avec l'équipe soignante

## 🛠 Utilisation Technique

### Dans le Code

Les comptes de test sont définis dans `src/utils/testUsers.js` :

```javascript
import { validateTestCredentials, TEST_ACCOUNTS_INFO } from '../utils/testUsers';

// Validation des identifiants
const testUser = validateTestCredentials(email, password);
```

### Authentification

L'AuthContext vérifie automatiquement les comptes de test avant Firebase :

1. Vérification des identifiants de test
2. Si trouvé → connexion immédiate avec profil simulé
3. Sinon → tentative de connexion Firebase classique

### Interface Utilisateur

Le `LoginScreen` affiche automatiquement les comptes de test disponibles avec :
- Informations visuelles claires
- Boutons pour remplissage automatique
- Descriptions des fonctionnalités

## 📱 Flux de Navigation

### Infirmière (admin)
```
Login → NurseTabNavigator
├── Dashboard (Accueil)
├── Patients (Liste des patients)
├── Tournée (Planification)
├── Messages (Communication)
└── Profil (Paramètres)
```

### Patient (patient)
```
Login → PatientTabNavigator
├── Dashboard (Accueil)
├── Historique (Soins reçus)
└── Messages (Communication)
```

### Famille (famille)
```
Login → PatientTabNavigator (avec accès famille)
├── Dashboard (Suivi du proche)
├── Historique (Historique du proche)
└── Messages (Communication équipe)
```

## 🔧 Configuration pour le Développement

### Activation/Désactivation

Pour désactiver les comptes de test en production :

```javascript
// Dans AuthContext.js
const IS_DEVELOPMENT = __DEV__; // ou process.env.NODE_ENV === 'development'

const login = async (email, password) => {
  if (IS_DEVELOPMENT) {
    const testUser = validateTestCredentials(email, password);
    // ... logique de test
  }
  // ... logique Firebase normale
};
```

### Ajout de Nouveaux Comptes

1. Modifier `src/utils/testUsers.js`
2. Ajouter le nouvel utilisateur dans `TEST_USERS`
3. Mettre à jour `TEST_ACCOUNTS_INFO` pour l'affichage
4. Tester la connexion

## 🚀 Utilisation Rapide

### Pour les Développeurs
1. Lancez l'application
2. Allez à l'écran de connexion
3. Appuyez sur une carte de compte de test
4. Les champs se remplissent automatiquement
5. Appuyez sur "Se connecter"

### Pour les Démonstrations
- **Infirmière** : Montrez la gestion complète des patients
- **Patient** : Présentez l'expérience patient
- **Famille** : Démontrez le suivi familial

## ⚠ Sécurité

- ❌ **Ne jamais** utiliser en production
- ❌ **Ne jamais** commiter de vrais identifiants
- ✅ **Toujours** désactiver en mode production
- ✅ **Utiliser** uniquement pour le développement

## 🔄 Maintenance

### Mise à Jour des Profils
- Modifier `src/utils/testUsers.js`
- Redémarrer l'application
- Tester les nouveaux profils

### Suppression
- Supprimer les importations dans `AuthContext.js`
- Supprimer le fichier `testUsers.js`
- Nettoyer les références dans `LoginScreen.js`

---

*Ce système de comptes de test facilite grandement le développement et les tests de l'application SoinLokal.*

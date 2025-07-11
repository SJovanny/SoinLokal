# SoinLokal 🏥

Application mobile React Native dédiée aux infirmières libérales et patients en Martinique pour optimiser les soins à domicile.

## 📱 À propos

SoinLokal est une solution complète qui simplifie la gestion quotidienne des infirmières libérales en Martinique tout en améliorant le suivi des patients à domicile. L'application propose des outils adaptés aux réalités locales avec géolocalisation, optimisation des tournées et messagerie sécurisée.

## ✨ Fonctionnalités principales

### Pour les Infirmières 👩‍⚕️
- ✅ **Tableau de bord personnalisé** avec vue d'ensemble quotidienne
- ✅ **Gestion des patients** avec fiches complètes et historique
- ✅ **Optimisation des tournées** avec géolocalisation GPS
- ✅ **Agenda intelligent** avec notifications et rappels
- ✅ **Historique des soins** avec photos et signatures numériques
- ✅ **Messagerie sécurisée** avec patients et familles
- ✅ **Profil professionnel** avec spécialités et zones d'intervention

### Pour les Patients/Familles 👨‍👩‍👧‍👦
- ✅ **Suivi des soins** en temps réel
- ✅ **Historique médical** accessible et sécurisé
- ✅ **Communication directe** avec l'infirmière
- ✅ **Notifications** pour les rendez-vous à venir
- ✅ **Localisation** de l'infirmière (optionnel)

## 🛠 Technologies utilisées

- **React Native** avec Expo CLI
- **Firebase** (Authentication, Firestore, Storage)
- **React Navigation** v6 pour la navigation
- **Google Maps API** pour la géolocalisation
- **React Native Elements** pour l'interface utilisateur
- **Expo Location** pour la géolocalisation
- **Expo Camera/ImagePicker** pour les photos

## 🚀 Installation et démarrage

### Prérequis
- Node.js 16+ 
- npm ou yarn
- Expo CLI : `npm install -g expo-cli`
- Compte Firebase configuré

### Installation
```bash
# Cloner le repository
git clone <repository-url>
cd KEYPEYIA

# Installer les dépendances
npm install

# Configuration Firebase
# 1. Créer un projet Firebase
# 2. Activer Authentication, Firestore et Storage
# 3. Mettre à jour src/services/firebase.js avec vos clés

# Démarrer l'application
npm start
```

### Scripts disponibles
```bash
npm start          # Démarrer Expo
npm run android    # Lancer sur Android
npm run ios        # Lancer sur iOS (macOS requis)
npm run web        # Lancer sur navigateur web
```

## 📁 Structure du projet

```
src/
├── components/          # Composants réutilisables
├── screens/            # Écrans de l'application
│   ├── auth/           # Authentification
│   ├── nurse/          # Interface infirmière
│   ├── patient/        # Interface patient
│   └── shared/         # Écrans partagés
├── navigation/         # Configuration navigation
├── services/           # Services Firebase et API
├── contexts/           # Contextes React (Auth, Theme)
├── utils/             # Utilitaires et helpers
└── hooks/             # Hooks personnalisés
```

## 🔧 Configuration

### Firebase
1. Créer un projet sur [Firebase Console](https://console.firebase.google.com)
2. Activer les services :
   - Authentication (Email/Password)
   - Cloud Firestore
   - Storage
3. Mettre à jour `src/services/firebase.js` avec votre configuration

### Google Maps
1. Obtenir une clé API Google Maps
2. Activer les API nécessaires :
   - Maps SDK for Android/iOS
   - Places API
   - Directions API

## 👥 Types d'utilisateurs

### Infirmière libérale
- Inscription avec numéro ADELI
- Vérification manuelle du profil
- Accès complet aux fonctionnalités professionnelles

### Patient/Famille
- Inscription simplifiée
- Accès aux informations de soins
- Communication avec l'infirmière assignée

## 🏗 Roadmap de développement

### Phase 1 (MVP) ✅
- [x] Authentification et gestion des profils
- [x] Interface de base infirmière/patient
- [x] Navigation principale
- [ ] Gestion des patients
- [ ] Tournées avec géolocalisation
- [ ] Messagerie de base

### Phase 2
- [ ] Signatures numériques
- [ ] Photos des soins
- [ ] Notifications push
- [ ] Mode hors-ligne
- [ ] Rapports et statistiques

### Phase 3
- [ ] Intégration DMP (Dossier Médical Partagé)
- [ ] Facturation automatisée
- [ ] Partenariats pharmacies
- [ ] Formation intégrée

## 🌍 Spécificités Martinique

- **Communes supportées** : Toutes les 34 communes de Martinique
- **Adaptation locale** : Interface en français avec références locales
- **Géolocalisation optimisée** : Algorithmes adaptés au relief martiniquais
- **Conformité RGPD** : Respect de la réglementation européenne

## 📊 Modèle économique

- **Freemium** : Première année gratuite pour les infirmières
- **Abonnement mensuel** : 29€/mois pour les infirmières (après période gratuite)
- **Gratuit pour les patients** : Accès illimité sans frais
- **Partenariats** : Intégration avec mutuelles et ARS Martinique

## 🔒 Sécurité et confidentialité

- **Chiffrement end-to-end** pour les messages
- **Stockage sécurisé** des données médicales
- **Authentification forte** avec validation
- **Conformité RGPD** et réglementation santé française

## 📞 Support et contact

Pour toute question ou demande de fonctionnalité :
- Email : support@soinlokal.mq
- Téléphone : 0596 XX XX XX

## 📄 Licence

Ce projet est sous licence propriétaire. Tous droits réservés.

---

**SoinLokal** - *Soins à domicile en Martinique* 🏝️

Développé avec ❤️ pour les professionnels de santé martiniquais

# SoinLokal 🏥

Application mobile React Native dédiée aux infirmières libérales et patients en Martinique pour optimiser les soins à domicile.

## 📱 À propos

SoinLokal est une solution complète qui simplifie la gestion quotidienne des infirmières libérales en Martinique tout en améliorant le suivi des patients à domicile. L'application propose des outils adaptés aux réalités locales avec géolocalisation, optimisation des tournées et messagerie sécurisée.

## ✨ Fonctionnalités principales

### Pour les Infirmières 👩‍⚕️
- ✅ **Tableau de bord personnalisé** avec vue d'ensemble quotidienne
- ✅ **Gestion des patients** avec fiches completes et historique
- ✅ **Optimisation des tournees** avec geolocalisation GPS
- ✅ **Agenda intelligent** avec rendez-vous et rappels
- ✅ **Vérification RPPS** obligatoire pour l'inscription
- ✅ **Messagerie sécurisée** avec patients et familles
- ✅ **Profil professionnel** avec specialites et zones d'intervention
- ✅ **Export PDF** des historiques de soins
- ⏳ **Historique des soins** avec photos et signatures numeriques

### Pour les Patients/Familles 👨‍👩‍👧‍👦
- ✅ **Suivi des soins** en temps reel
- ✅ **Historique des soins** accessible et securise
- ✅ **Communication directe** avec l'infirmiere
- ✅ **Comptes famille** (ombres) pour gerer les proches non-connectes
- ✅ **Profil de l'infirmiere** consultable
- ⏳ **Notifications** pour les rendez-vous a venir

## 🛠 Technologies utilisees

- **React Native** avec Expo SDK 54
- **Supabase** (Auth, PostgreSQL, Storage, Edge Functions, Realtime)
- **React Navigation** v7 (stack + bottom tabs)
- **Tamagui 2.4** (design system)
- **Mapbox** (Geocoding + Directions API) + react-native-maps
- **Expo Location**, Camera, ImagePicker, Print, Document Picker
- **TypeScript** en mode strict

## 🚀 Installation et demarrage

### Prerequis
- Node.js 18+
- npm ou yarn
- Expo CLI : `npm install -g expo-cli`
- Compte Supabase configure
- Cle API Mapbox

### Installation
```bash
# Cloner le repository
git clone <repository-url>
cd SoinLokal

# Installer les dependances
npm install

# Configuration des variables d'environnement
# 1. Copier .env.example (ou creer un .env) avec vos cles :
#    EXPO_PUBLIC_SUPABASE_URL=<votre-url-supabase>
#    EXPO_PUBLIC_SUPABASE_ANON_KEY=<votre-cle-anon>
#    EXPO_PUBLIC_MAPBOX_API_KEY=<votre-cle-mapbox>
# 2. Configurer votre projet Supabase (base de donnees, Auth, Storage, Edge Functions)

# Demarrer l'application
npm start
```

### Scripts disponibles
```bash
npm start          # Demarrer Expo
npm run android    # Lancer sur Android
npm run ios        # Lancer sur iOS (macOS requis)
npm run web        # Lancer sur navigateur web
npm run typecheck  # Verifier le typage TypeScript
npm run seed       # Peupler la base avec des donnees de test
```

## 📁 Structure du projet

```
src/
├── components/          # Composants reutilisables
│   └── ui/              # Composants UI de base (Button, Input, Card...)
├── screens/            # Ecrans de l'application
│   ├── auth/           # Authentification (Login, Register, UserType)
│   ├── nurse/          # Interface infirmiere (Dashboard, Patients, Tournee)
│   ├── patient/        # Interface patient
│   ├── family/         # Interface famille (Dashboard, Suivi, Profil infirmiere)
│   ├── shared/         # Ecrans partages (Messagerie, Chat)
│   └── admin/          # Ecran admin (redirection portail web)
├── navigation/         # Configuration navigation (AppNavigator)
├── contexts/           # Contextes React (Auth, MessageCount)
├── utils/              # Utilitaires (supabase, mapbox, geocoding, routing, pdf)
├── types/              # Declarations TypeScript
└── polyfills.ts        # Polyfills pour l'environnement React Native

admin-web/              # Portail d'administration (React + Vite)
supabase/               # Migrations SQL et Edge Functions (Deno)
scripts/                # Scripts utilitaires (seed, geocodage, creation admin)
```

## 🔧 Configuration

### Supabase
1. Creer un projet sur [Supabase](https://supabase.com)
2. Configurer les services :
   - Authentication (Email/Password)
   - Base de donnees PostgreSQL
   - Storage (avatars, documents infirmiers)
   - Edge Functions (verification RPPS, creation patient gere)
   - Realtime (messagerie)
3. Appliquer les migrations : `npx supabase migration up`
4. Configurer les variables d'environnement dans le fichier `.env`

### Mapbox
1. Obtenir une cle API Mapbox
2. Activer les services :
   - Geocoding API
   - Directions API
3. Ajouter la cle dans le `.env` : `EXPO_PUBLIC_MAPBOX_API_KEY`

## 👥 Types d'utilisateurs

### Infirmiere liberale
- Inscription avec numero RPPS
- Verification manuelle du profil (justificatifs)
- Acces complet aux fonctionnalites professionnelles

### Patient
- Inscription simplifiee ou invitation par l'infirmiere
- Acces aux informations de soins
- Communication avec l'infirmiere assignee

### Famille (proche aidant)
- Creation de comptes ombres pour les patients non-connectes
- Suivi des soins des proches geres
- Messagerie avec l'equipe soignante

### Administrateur
- Portail web dedie (admin-web/)
- Verification des profils infirmiers
- Gestion des utilisateurs

## 🏗 Roadmap de developpement

### Phase 1 (MVP) ✅
- [x] Authentification et gestion des profils
- [x] Interface de base infirmiere/patient/famille
- [x] Navigation principale (stack + bottom tabs)
- [x] Gestion des patients (creation, fiche detaillee)
- [x] Tournees avec geolocalisation et optimisation
- [x] Messagerie securisee (temps reel via Supabase Realtime)
- [x] Verification RPPS des infirmieres
- [x] Portail d'administration web
- [x] Comptes famille (ombres) pour patients non-connectes

### Phase 2
- [ ] Signatures numeriques
- [ ] Photos des soins
- [ ] Notifications push
- [ ] Mode hors-ligne
- [ ] Rapports et statistiques avances

### Phase 3
- [ ] Integration DMP (Dossier Medical Partage)
- [ ] Facturation automatisee
- [ ] Partenariats pharmacies
- [ ] Formation integree

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

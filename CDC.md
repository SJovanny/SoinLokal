# 📁 PROJET : SoinLokal - Spécifications Techniques

## 1. Vision du Projet
Application mobile unique avec deux interfaces distinctes selon le rôle connecté :
1.  **Interface Pro (Infirmier) :** Outil de productivité, gestion de tournée, offline-first, géolocalisation.
2.  **Interface Famille (Patient/Aidant) :** Outil de réassurance, suivi de passage, carnet de liaison.

**Contexte spécifique :** Martinique (Zones blanches, adresses parfois complexes, routes sinueuses).

---

## 2. Stack Technique
* **Mobile (Frontend) :** React Native (Expo SDK 54).
* **Langage :** TypeScript (Strict mode).
* **Backend :** Supabase (PostgreSQL, Auth, Storage, Edge Functions Deno, Realtime).
* **Design System :** Tamagui 2.4.
* **Offline/Sync :** Non implemente (prevue WatermelonDB ou MMKV + TanStack Query).
* **Cartographie :** Mapbox (Geocoding + Directions API) + react-native-maps + Deep linking vers Waze / Google Maps.

---

## 3. Architecture Base de Donnees (PostgreSQL via Supabase)

### A. Gestion des Utilisateurs & Roles
**`profiles`**
* `id` (UUID, lie a auth.users)
* `email`, `first_name`, `last_name`
* `user_type` (Enum: `nurse`, `patient`, `family`)
* `phone`, `photo_url`, `avatar_type`, `avatar_seed`
* `verified` (boolean)
* `is_admin` (boolean)
* `created_at`, `updated_at`

### B. Module Infirmier
**`nurse_profiles`**
* `profile_id` (FK -> profiles)
* `adeli` (historique), `rpps_number` (obligatoire)
* `verification_status` (Enum: `pending_docs`, `pending_review`, `pending`, `verified`, `manual_review`, `rejected`)
* `rejection_note`
* `specialties` (text[]), `zone`, `address`, `gps_lat`, `gps_lng`
* `bio`, `rating`, `total_patients`, `total_visits`
* Documents: `cni_path`, `justificatif_domicile_path`, `carte_pro_path`

**`nurse_verification_requests`**
* `id` (UUID)
* `profile_id` (FK -> profiles)
* `document_path`, `status` (pending/approved/rejected), `notes`
* `reviewed_by`, `reviewed_at`

**`nurse_care_types`**
* `id` (UUID), `nurse_id` (FK -> profiles), `name`

### C. Module Patient
**`patient_profiles`**
* `profile_id` (FK -> profiles)
* `dob`, `address`, `address_label`, `gps_lat`, `gps_lng`
* `access_code` (digicode, cle...)
* `emergency_contact`, `medical_notes`, `allergies` (text[])
* `managed_by` (FK -> profiles, pour comptes ombres famille)
* `is_managed` (boolean)

**`patient_files`** (Le dossier medical cree par l'infirmiere)
* `id` (UUID)
* `patient_id` (FK -> profiles)
* `nurse_id` (FK -> profiles - L'infirmiere titulaire)
* `prescription`, `care_plan`
* `is_active` (boolean)

### D. Rendez-vous
**`appointments`**
* `id` (UUID)
* `patient_file_id` (FK -> patient_files)
* `nurse_id` (FK -> profiles)
* `date` (date), `time` (time)
* `care_type` (text), `duration_min` (int)
* `status` (Enum: `pending`, `confirmed`, `completed`, `cancelled`)
* `address`, `notes`, `completion_note`, `care_performed`
* `observations`, `remarks`
* `visible_to_patient` (boolean)

### E. Module Famille / Liaison
**`family_links`**
* `id` (UUID)
* `family_user_id` (FK -> profiles - Le compte du proche)
* `patient_file_id` (FK -> patient_files)
* `permissions` (Enum: `read_only`, `can_message`)

**`messages`**
* `id` (UUID)
* `author_id` (FK -> profiles)
* `patient_file_id` (FK -> patient_files)
* `content` (text), `is_read` (boolean)
* `created_at` (timestamptz)

---

## 4. Fonctionnalites

### 🚑 Cote Infirmier (La priorite)
1.  **Agenda & Routing :**
    * Calcule automatique de l'ordre de passage (optimisation de tournee). **[FAIT]**
    * Bouton "Go" -> Ouvre Waze / Google Maps avec les coordonnees GPS exactes. **[FAIT]**
    * Vue carte avec les patients du jour et navigation integree. **[FAIT]**
2.  **Gestion Patient :**
    * Creation fiche patient avec coordonnees GPS (geocodage Mapbox). **[FAIT]**
    * Photo ordonnance et plan de soins. **[FAIT]**
    * Invitation de la famille (generation d'un lien/code d'invitation). **[FAIT]**
    * Export PDF de l'historique. **[FAIT]**
3.  **Verification RPPS :**
    * Verification du numero RPPS via Edge Function Supabase. **[FAIT]**
    * Upload de justificatifs (CNI, carte pro, justificatif domicile). **[FAIT]**
    * Workflow de validation par l'administrateur. **[FAIT]**
4.  **Messagerie securisee :**
    * Chat temps reel via Supabase Realtime entre infirmiere, patient et famille. **[FAIT]**
    * Messagerie proxy : la famille peut envoyer des messages au nom du patient gere. **[FAIT]**

### 🏠 Cote Patient / Famille
1.  **Onboarding Securise :**
    * Le patient ne peut pas creer de compte vide. Doit entrer un code fourni par l'infirmiere. **[FAIT]**
    * Tutoriel d'introduction au premier lancement. **[FAIT]**
2.  **Suivi des soins :**
    * Vue calendrier des rendez-vous et historique. **[FAIT]**
    * Consultation du profil de l'infirmiere assignee. **[FAIT]**
3.  **Comptes famille (ombres) :**
    * Creation de profils patients geres par un proche. **[FAIT]**
    * Suivi des soins des proches non-connectes. **[FAIT]**

### ⏳ A faire
1.  **Signatures numeriques :** Validation des soins par signature sur l'ecran.
2.  **Photos des soins :** Capture et stockage des photos de plaies/pansements.
3.  **Mode Offline-First (CRITIQUE) :**
    * Telechargement de la tournee le matin en Wi-Fi.
    * Possibilite de valider un soin sans reseau.
    * Synchronisation automatique au retour de la 4G.
4.  **Notifications push :** Rappels de rendez-vous et nouveaux messages.

---

## 5. Logique des Dossiers (React Native)

Structure recommandee pour separer les interfaces par role :

```text
src/
├── navigation/
│   └── AppNavigator.tsx         # Root navigator (Auth | Nurse | Patient | Family | Admin)
├── screens/
│   ├── auth/                    # Login, Register, UserType, ForgotPassword
│   ├── nurse/                   # Dashboard, PatientsList, PatientDetail, Tournee, Profile, CareHistory
│   ├── patient/                 # Dashboard, CareHistory, Profile
│   ├── family/                  # Dashboard, CareHistory, Profile, AddManagedPatient, NurseProfileView
│   ├── shared/                  # MessagingScreen, ChatScreen
│   └── admin/                   # AdminWebOnlyScreen (redirection portail web)
├── components/                  # Boutons, Cards, UI shared, Avatars, SplashScreen
│   └── ui/                      # AppButton, AppInput, DashboardHeader, StatCard, AppointmentCard...
├── contexts/                    # AuthContext, MessageCountContext
├── utils/                       # supabase, mapbox, geocoding, routing, pdfExport, constants, helpers
└── types/                       # Declarations TypeScript (.d.ts)

admin-web/                       # Portail admin (React + Vite + TypeScript)
├── src/
│   ├── pages/                   # Login, VerificationQueue, VerificationDetail
│   ├── components/              # Layout, ProtectedRoute
│   ├── contexts/                # AuthContext
│   └── lib/                     # supabase client

supabase/
├── functions/                   # Edge Functions (verify-rpps, create-managed-patient)
└── migrations/                  # Migrations SQL

scripts/                         # seed, regeocode, create-admin
```
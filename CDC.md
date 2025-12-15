# 📁 PROJET : SoinLokal - Spécifications Techniques

## 1. Vision du Projet
Application mobile unique avec deux interfaces distinctes selon le rôle connecté :
1.  **Interface Pro (Infirmier) :** Outil de productivité, gestion de tournée, offline-first, géolocalisation.
2.  **Interface Famille (Patient/Aidant) :** Outil de réassurance, suivi de passage, carnet de liaison.

**Contexte spécifique :** Martinique (Zones blanches, adresses parfois complexes, routes sinueuses).

---

## 2. Stack Technique
* **Mobile (Frontend) :** React Native (Expo SDK 50+).
* **Langage :** TypeScript (Strict mode).
* **Backend (API) :** Node.js (Express ou NestJS).
* **Base de Données :** PostgreSQL.
* **ORM :** Prisma (Recommandé pour TypeScript).
* **Offline/Sync :** WatermelonDB ou TanStack Query (React Query) + MMKV.
* **Cartographie :** Google Maps API (Geocoding) + Deep linking vers Waze.

---

## 3. Architecture Base de Données (PostgreSQL)

### A. Gestion des Utilisateurs & Rôles
**`User`**
* `id` (UUID)
* `email`, `password_hash`
* `role` (Enum: `NURSE`, `PATIENT`, `FAMILY`)
* `push_token` (Pour les notifications)

### B. Module Infirmier
**`NurseProfile`**
* `user_id` (FK)
* `rpps_number`
* `zone_intervention`

**`PatientFile`** (Le dossier médical)
* `id` (UUID)
* `nurse_id` (FK - L'infirmier titulaire)
* `full_name`, `dob`
* `address_label` (ex: "Maison jaune après le manguier")
* `gps_coordinates` (Lat/Long - Vital !)
* `access_code` (Digicode, clé...)

**`Appointment`** (Le soin planifié)
* `id` (UUID)
* `patient_file_id` (FK)
* `scheduled_at` (DateTime)
* `status` (Enum: `PENDING`, `DONE`, `MISSED`)
* `care_type` (Enum: `PANSEMENT`, `INJECTION`, `TOILETTE`...)
* `nurse_notes` (Privé infirmier)

### C. Module Famille / Liaison
**`FamilyLink`** (Qui a le droit de voir quoi)
* `id`
* `user_id` (Le compte de la fille/fils)
* `patient_file_id` (Le dossier du parent)
* `permissions` (Enum: `READ_ONLY`, `CAN_MESSAGE`)

**`Message`** (Carnet de liaison)
* `id`
* `author_id` (User)
* `patient_file_id` (Contexte)
* `content` (Text)
* `is_read` (Boolean)

---

## 4. Fonctionnalités à Implémenter

### 🚑 Côté Infirmier (La priorité)
1.  **Mode Offline-First (CRITIQUE) :**
    * Téléchargement de la tournée le matin en Wi-Fi.
    * Possibilité de valider un soin, prendre une photo et écrire une note sans réseau.
    * Synchronisation automatique dès le retour de la 4G.
2.  **Agenda & Routing :**
    * Calcul automatique de l'ordre de passage (Optimisation simple).
    * Bouton "Go" -> Ouvre Waze avec les coordonnées GPS exactes.
3.  **Gestion Patient :**
    * Création fiche patient + Photo ordonnance.
    * Invitation de la famille (Génération d'un lien/code d'invitation).

### 🏠 Côté Patient / Famille
1.  **Onboarding Sécurisé :**
    * Ne peut pas créer de compte "vide". Doit entrer un code fourni par l'infirmier pour se lier à un dossier.
2.  **Timeline des soins (Fil de vie) :**
    * Vue simple : "Passage prévu ce matin" -> "Passage effectué à 09h12".
    * Indicateur visuel rassurant (Vert = Tout va bien).
3.  **Messagerie Asynchrone :**
    * Chat sécurisé avec l'infirmier (pas de harcèlement, l'infirmier répond quand il peut).
    * Envoi de demandes simples ("Besoin de renouveler l'ordonnance").

---

## 5. Logique des Dossiers (React Native)

Structure recommandée pour ne pas mélanger les deux mondes :

```text
src/
├── navigation/
│   ├── RootNavigator.tsx  # Switch (Auth ? Nurse : Patient)
│   ├── NurseStack.tsx     # Ecrans Pro
│   └── PatientStack.tsx   # Ecrans Famille
├── screens/
│   ├── nurse/             # Dashboard, Map, SoinDetail
│   └── patient/           # Timeline, ChatFamille
├── components/            # Boutons, Cards (partagés)
├── store/                 # Zustand/Redux (Gestion État Global)
└── services/              # API, Auth, Database Local
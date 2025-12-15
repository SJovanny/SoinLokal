C'est parti. Voici les deux documents complets et unifiés. Tu n'as plus qu'à copier-coller ça dans ton gestionnaire de projet ou dans des fichiers `.md` à la racine de ton code.

-----

### 📄 Document 1 : Cahier des Charges Technique & Fonctionnel (Complet)

Ce document décrit l'architecture globale pour l'infirmier **ET** le patient.

````markdown
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
````

````

---

### 🔄 Document 2 : User Flows (Parcours Utilisateur)

Ce document t'aide à visualiser l'enchaînement des écrans pour le développement.

```markdown
# 🔄 User Flows - SoinLokal

## Légende
* 🟢 **Début**
* 🔷 **Action Utilisateur**
* 🔶 **Système / Backend**
* 🏁 **Fin**

---

## Flow 1 : Le Matin de l'Infirmier (La Tournée)
*Contexte : 06h00 du matin, café, Wi-Fi maison.*

1.  🟢 **Infirmier :** Ouvre l'application.
2.  🔶 **Système :** `SYNC_START` -> Télécharge les données mises à jour (messages familles, nouveaux soins).
3.  🔷 **Infirmier :** Consulte la "Tournée du jour".
4.  🔷 **Infirmier :** Clique sur "Démarrer la tournée".
5.  🔶 **Système :** Active le mode "En tournée" (prépare le GPS).
6.  🔷 **Infirmier :** Clique sur Patient 1 -> "Y aller" (Waze s'ouvre).
7.  *(Trajet voiture)*
8.  🔷 **Infirmier :** Arrive, fait le soin.
9.  🔷 **Infirmier :** Valide le soin dans l'app (Coche ✅).
10. 🔶 **Système :** Envoie une notification Push à la famille : "L'infirmier est passé".
11. 🏁 **Passage au patient suivant.**

---

## Flow 2 : L'Invitation de la Famille (L'Enrôlement)
*Contexte : L'infirmier est chez un patient âgé, la fille du patient est présente ou au téléphone.*

1.  🟢 **Infirmier :** Va sur la fiche du patient "M. Césaire".
2.  🔷 **Infirmier :** Clique sur "Accès Famille" -> "Générer une invitation".
3.  🔶 **Système :** Crée un code unique temporaire (ex: `SOIN-9821`).
4.  🔷 **Infirmier :** Partage le code par SMS/WhatsApp à la fille du patient.
5.  --- *Changement d'acteur : La Fille* ---
6.  🟢 **Fille :** Télécharge l'app SoinLokal.
7.  🔷 **Fille :** Écran d'accueil -> Choisit "Espace Famille".
8.  🔷 **Fille :** Entre le code `SOIN-9821`.
9.  🔶 **Système :** Vérifie le code, crée le compte utilisateur, lie le compte au dossier "M. Césaire".
10. 🏁 **La fille accède à la Timeline de son père.**

---

## Flow 3 : La Réassurance (Usage Famille)
*Contexte : La fille est à Fort-de-France, son père est au Morne-Rouge.*

1.  🟢 **Fille :** Reçoit une notification "Soin effectué".
2.  🔷 **Fille :** Ouvre l'app.
3.  🔶 **Système :** Affiche la Timeline.
    * *08:00 - Toilette & Pansement (✅ Fait par Julien IDEL)*
4.  🔷 **Fille :** Voit une petite note : "Plaie propre, cicatrisation en bonne voie".
5.  🔷 **Fille :** Clique sur "Message" pour répondre.
6.  🔷 **Fille :** Écrit : "Merci Julien ! N'oubliez pas qu'il a rdv cardio demain à 14h".
7.  🏁 **Message envoyé.**

---

## Flow 4 : Le Cas "Zone Blanche" (Technique)
*Contexte : Pas de réseau.*

1.  🟢 **Infirmier :** Essaie de valider un soin.
2.  🔶 **Système (App) :** Détecte `Network.isConnected === false`.
3.  🔶 **Système :** Sauvegarde l'action dans la base locale (WatermelonDB / SQLite).
4.  🔶 **UI :** Affiche une icône "☁️ En attente" à côté du soin.
5.  *(Plus tard, retour du réseau)*
6.  🔶 **Système :** `BackgroundSync` détecte la 4G.
7.  🔶 **Système :** Pousse les données vers PostgreSQL.
8.  🔶 **Système :** Envoie la notif à la famille (avec du retard, mais envoyée quand même).
9.  🏁 **Tout est synchro.**
````
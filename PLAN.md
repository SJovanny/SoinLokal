# Plan d'exécution — Branche `parallel`

## Organisation générale

- **1 feature = 1 commit** avec message conventionnel
- **Chaque agent fait une review** avant de terminer (relire son code, vérifier types, cohérence)
- **SOLID** : Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion
- **Pas de DRY** : pas de duplication, extraire les utilitaires communs
- **Pas de commentaires** dans le code sauf nécessité absolue

---

## Vague 1 — Infrastructure & Quick Wins (parallèle)

### Tâche A : #7 Documentation (README + CDC)
**Agent** : general — écriture de markdown
**Fichiers** : `README.md`, `CDC.md`
**Contenu** :
- Remplacer toutes les références à Firebase → Supabase
- Remplacer Google Maps API → Mapbox
- Mettre à jour la stack technique dans le CDC (PostgreSQL via Supabase, pas Node/Express)
- Mettre à jour la structure du projet réelle
- Mettre à jour les instructions d'installation (plus de Firebase, mais Supabase)
- Mettre à jour la roadmap (Phase 1 en grande partie done)

### Tâche B : #5 CI/CD (GitHub Actions)
**Agent** : general — écriture de YAML
**Fichiers** : `.github/workflows/ci.yml`
**Contenu** :
- Workflow déclenché sur `push` vers `main` et `develop`, et sur `pull_request`
- Job 1 : Typecheck (`tsc --noEmit`)
- Job 2 : Lint (vérifier si eslint config existe, sinon configurer)
- Job 3 : Admin web build (`npm --prefix admin-web run build`)
- Utiliser `actions/setup-node` avec Node 20
- Cache node_modules

### Tâche C : #13 Gestion d'erreurs réseau
**Agent** : general — React components + hooks
**Fichiers à créer** :
- `src/components/ErrorBoundary.tsx` — composant classe React, capture les erreurs render
- `src/hooks/useNetworkStatus.ts` — hook basé sur `@react-native-community/netinfo` (ou expo-network) qui expose `isConnected`
- `src/utils/retry.ts` — fonction `withRetry(fn, options)` avec exponential backoff (3 tentatives max)
- `src/components/NetworkStatusToast.tsx` — toast "Pas de connexion" visible en bas d'écran
- `src/components/FullScreenError.tsx` — écran d'erreur global avec bouton "Réessayer"
**Fichiers à modifier** :
- `App.tsx` — wrapper ErrorBoundary autour du contenu principal
- `src/utils/supabase.ts` — wrapper withRetry sur les appels critiques

---

## Vague 2 — Features (parallèle, dépend de la vague 1 pour la structure)

### Tâche D : #14 Dark mode
**Agent** : general — Tamagui + React Context
**Fichiers à créer** :
- `src/contexts/ThemeContext.tsx` — contexte avec `isDark`, `toggleTheme`, persistence AsyncStorage
- `src/styles/themes.ts` — light/dark theme objects compatibles Tamagui
**Fichiers à modifier** :
- `tamagui.config.js` — ajouter les tokens dark
- `App.tsx` — wrapper ThemeProvider, détection du thème sauvegardé
- `src/utils/constants.ts` — ajouter une version dark des couleurs (COLORS_DARK)

### Tâche E : #15 Export données patient (RGPD)
**Agent** : general — extension du système PDF existant
**Fichiers à créer** :
- `src/utils/dataExport.ts` — assemble les données du patient (profil, RDV, historique) en objet exportable
- `src/screens/patient/ExportDataScreen.tsx` — écran avec choix JSON ou PDF
**Fichiers à modifier** :
- `src/utils/pdfExport.ts` — ajouter un template "dossier patient complet" (profil + historique + RDV)
- Navigation patient — ajouter l'écran ExportDataScreen

### Tâche F : #17 Internationalisation (i18n)
**Agent** : general — setup i18next
**Fichiers à créer** :
- `src/i18n/index.ts` — init i18next avec détection de langue (expo-localization)
- `src/i18n/locales/fr.json` — toutes les strings françaises
- `src/i18n/locales/en.json` — traductions anglaises (ou en initial avec fr)
- `src/i18n/types.ts` — types pour les clés de traduction
**Fichiers à modifier** :
- `App.tsx` — initialiser i18n au démarrage
- Migrer les strings des écrans clés : LoginScreen, RegisterScreen, NurseDashboard, PatientDashboard

---

## Vague 3 — Feature complexe (séquentiel)

### Tâche G : #9 Signatures numériques
**Agent** : general — composant signature + intégration
**Fichiers à créer** :
- `src/components/SignaturePad.tsx` — canvas tactile avec react-native-signature-canvas ou react-native-skia
- `src/components/SignatureModal.tsx` — modal plein écran avec SignaturePad + boutons "Effacer" / "Valider"
- `src/utils/signatureStorage.ts` — upload vers Supabase Storage
**Fichiers à modifier** :
- `src/components/CompletionModal.tsx` — ajouter un champ signature au formulaire d'achèvement de soin
- Schéma DB : ajouter colonne `signature_path` dans `appointments` (via migration)
- `src/utils/supabase.ts` — ajouter l'interface SignatureData

---

## Vague 4 — Évaluation (séquentiel)

### Tâche H : #18 Widget mobile
**Analyse** : En Expo managed workflow, les widgets d'écran d'accueil (iOS WidgetKit, Android AppWidget) ne sont pas supportés nativement. Options :
1. Ejecter en bare workflow → perte des avantages Expo
2. Module natif via `expo-modules-core` → complexe, peu documenté pour widgets
3. Utiliser `react-native-widget-bridge` → instable
4. Reporter à plus tard

**Décision** : Reporté avec documentation dans BACKLOG.md.

---

## Ordre d'exécution

```
NOW     → Écrire BACKLOG.md ✅ (déjà fait)
        → Commit BACKLOG.md

WAVE 1  → Lancement parallèle des agents A (#7 Docs), B (#5 CI/CD), C (#13 Erreurs réseau)
        → Review + commit de chaque agent
        → Commit séparé par tâche

WAVE 2  → Lancement parallèle des agents D (#14 Dark mode), E (#15 Export), F (#17 i18n)
        → Review + commit de chaque agent
        → Commit séparé par tâche

WAVE 3  → Agent G (#9 Signature numérique)
        → Review + commit

WAVE 4  → Analyse #18 Widget → ajouter conclusion au BACKLOG.md → commit

FINAL   → Rapport de synthèse
```

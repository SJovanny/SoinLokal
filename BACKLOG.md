# Backlog — Items différés

Ce fichier liste les améliorations identifiées comme **non traitées dans la branche `parallel`**,
avec leur priorité et les prérequis techniques. À reprendre dans une prochaine itération.

---

## #1 — Mode hors-ligne (CRITIQUE)

**Problème** : Le CDC le qualifie de critique, mais rien n'est implémenté. En Martinique,
les zones blanches rendent l'app inutilisable sans réseau.

**Solution proposée** :
- WatermelonDB (base locale synchronisée) ou MMKV + file de sync
- Téléchargement de la tournée le matin en Wi-Fi
- Validation des soins + notes + photos sans réseau
- Sync automatique au retour de la 4G

**Complexité** : Très élevée (refonte archi partielle)

---

## #2 — Push notifications

**Problème** : Aucune notification push. Les patients ne sont pas rappelés des RDV,
les infirmières ne sont pas alertées des nouveaux messages.

**Solution proposée** :
- `expo-notifications` + gestion des push tokens dans Supabase
- Edge Function cron pour les rappels de RDV
- Canal dédié par type (rappel RDV, nouveau message, etc.)

**Complexité** : Élevée

---

## #3 — Sécurité des clés (.env)

**Problème** : Le `.env` contenant les clés est déjà dans `.gitignore`. ✅
Reste à auditer : pas de secret hardcodé dans le code source, rotation des clés,
utilisation des variables d'environnement EAS pour le build.

**Solution proposée** :
- Vérifier qu'aucune clé n'est hardcodée (grep)
- Configurer les secrets dans EAS dashboard
- Mettre en place une rotation périodique

**Complexité** : Faible

---

## #4 — Tests automatisés

**Problème** : Zéro test. Pour une app santé, c'est risqué.

**Solution proposée** :
- Jest + React Native Testing Library pour les unitaires et composants
- Detox pour les E2E sur les flows critiques (auth, création RDV, messagerie)
- Coverage minimum à 60% sur les utils et services

**Complexité** : Élevée (volume de code à couvrir)

---

## #6 — Configuration EAS (`eas.json`)

**Problème** : Pas de fichier `eas.json`. Les scripts `build:android` / `build:ios`
existent dans `package.json` mais sans profils de build.

**Solution proposée** :
- Créer `eas.json` avec profils : `development`, `preview`, `production`
- Configurer les variables d'environnement par profil
- Configurer le signing (keystore Android, provisioning iOS)

**Complexité** : Faible (config uniquement)

---

## #8 — Données de seed ciblées Martinique

**Problème** : Le seed, les quartiers (`STRASBOURG_QUARTIERS`), et le centre de carte
sont sur Strasbourg (continent). Le projet cible la Martinique.

**Solution proposée** :
- Remplacer `STRASBOURG_QUARTIERS` par les 34 communes de Martinique
- Déplacer le centre de carte vers Fort-de-France (14.6168, -61.0587)
- Regénérer des adresses de seed en Martinique via l'API BAN

**Complexité** : Faible

---

## #10 — Photos de soins

**Problème** : Prévu en Phase 2 du CDC. Impossible de documenter visuellement les soins
(plaies, pansements, évolution).

**Solution proposée** :
- Capture photo via `expo-camera` dans le flow d'achèvement de RDV
- Compression via `expo-image-manipulator`
- Upload vers Supabase Storage (bucket privé `care-photos`)
- Lien photo → appointment dans le schéma DB (colonne `photos` jsonb)

**Complexité** : Moyenne

---

## #11 — Accessibilité

**Problème** : Peu ou pas d'attributs d'accessibilité (`accessibilityLabel`, `role`, etc.).
Critique pour les patients âgés utilisant VoiceOver/TalkBack.

**Solution proposée** :
- Ajouter `accessibilityLabel` sur tous les composants interactifs
- Ajouter `accessibilityRole` sur les boutons, inputs
- Tester avec VoiceOver (iOS) et TalkBack (Android)
- Contraste suffisant (vérifier avec l'audit d'accessibilité Expo)

**Complexité** : Moyenne (systématique mais mécanique)

---

## #12 — Cache géocoding

**Problème** : Chaque appel à l'API Mapbox est facturé. Aucun cache local.

**Solution proposée** :
- Cache local (AsyncStorage) des adresses déjà géocodées
- TTL de 30 jours (les GPS ne changent pas)
- Réduire les coûts Mapbox de ~60%

**Complexité** : Faible

---

## #16 — Statistiques enrichies (dashboard infirmière)

**Problème** : Le dashboard infirmière montre juste des compteurs. Pas d'analytics.

**Solution proposée** :
- Chiffre d'affaires estimé (nb soins × tarifs conventionnels)
- Nombre de km parcourus (via Mapbox Directions ou Haversine)
- Temps moyen par patient
- Graphiques (victory-native ou react-native-chart-kit)
- Export comptable simplifié

**Complexité** : Moyenne

---

# Résumé

| # | Item | Priorité | Complexité | État |
|---|------|----------|------------|------|
| 1 | Mode hors-ligne | Critique | Très élevée | À faire |
| 2 | Push notifications | Haute | Élevée | À faire |
| 3 | Audit sécurité clés | Haute | Faible | À faire |
| 4 | Tests automatisés | Haute | Élevée | À faire |
| 6 | eas.json | Haute | Faible | À faire |
| 8 | Coordonnées Martinique | Moyenne | Faible | À faire |
| 10 | Photos de soins | Moyenne | Moyenne | À faire |
| 11 | Accessibilité | Moyenne | Moyenne | À faire |
| 12 | Cache géocoding | Moyenne | Faible | À faire |
| 16 | Statistiques enrichies | Basse | Moyenne | À faire |
| 18 | Widget écran d'accueil | Basse | Très élevée | Reporté |

---

## #18 — Widget écran d'accueil (iOS/Android)

**Problème** : Affichage du prochain RDV directement sur l'écran d'accueil sans ouvrir l'app.

**Analyse de faisabilité** :

| Approche | Faisabilité | Contrainte |
|----------|-------------|------------|
| Expo managed workflow | ❌ Impossible | Expo ne supporte pas les widgets natifs (WidgetKit, AppWidgetProvider) |
| Ejecter en bare workflow | ✅ Possible | Perte des avantages Expo (OTA updates, build simplifié) |
| Module natif via expo-modules-core | ⚠️ Théorique | Très complexe, peu documenté pour les widgets |
| App native séparée | ✅ Possible | Maintenir deux codebases, partager la logique via un package commun |
| react-native-widget-bridge | ⚠️ Instable | Librairie peu maintenue, bugs fréquents |

**Recommandation** : Reporter jusqu'à maturité de l'écosystème Expo pour les widgets.
Alternative pragmatique : notifier le prochain RDV via une notification locale persistante
(expo-notifications avec `ongoing: true`), ce qui donne un résultat similaire sans widget natif.


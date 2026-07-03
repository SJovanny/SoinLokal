# 🚀 Guide de Démarrage Rapide - SoinLokal

## Comptes de Test Disponibles

### 👩‍⚕️ Infirmière (Administratrice)
```
Email: admin@soinlokal.com
Mot de passe: admin
```
**Fonctionnalités :**
- Tableau de bord complet
- Gestion des patients
- Planification des tournées
- Messagerie professionnelle

### 🏥 Patient
```
Email: patient@soinlokal.com
Mot de passe: patient
```
**Fonctionnalités :**
- Interface patient
- Historique des soins
- Communication avec l'infirmière

### 👨‍👩‍👧‍👦 Famille/Proche
```
Email: famille@soinlokal.com
Mot de passe: famille
```
**Fonctionnalités :**
- Suivi d'un proche
- Notifications importantes
- Communication équipe soignante

## 🎯 Test Rapide

> ⚠️ Depuis l'intégration de `@rnmapbox/maps`, **Expo Go n'est plus compatible**
> (module natif requis). Utilise un **development build** à la place.

1. **Lancez l'application (development build)**
   ```bash
   # Premier lancement : génère les dossiers ios/ et android/
   # app.config.ts lit automatiquement EXPO_PUBLIC_MAPBOX_API_KEY depuis .env
   # et l'injecte dans le plugin @rnmapbox/maps (pas besoin de var d'env manuelle).
   npx expo prebuild --clean

   # Build + lancement sur simulateur iOS
   npx expo run:ios

   # Build + lancement sur votre iPhone (branché en USB / même Wi-Fi)
   npx expo run:ios --device
   ```
   Ensuite, le hot reload et le fast refresh fonctionnent comme avant.
   Tu ne relances le build natif que si tu ajoutes une nouvelle lib native.

   > **Token Mapbox** : il vient de `.env` (`EXPO_PUBLIC_MAPBOX_API_KEY`).
   > Ne committez jamais `.env` — il est dans `.gitignore`.

2. **(Alternative) EAS Build — build cloud d'un client de dev**
   ```bash
   eas build --profile development --platform ios
   ```
   Installe le `.ipa` via l'app EAS ou TestFlight (compte Apple payant).

2. **Accédez à l'écran de connexion**
   - Sélectionnez un type d'utilisateur
   - Appuyez sur une carte de compte de test
   - Connectez-vous automatiquement

3. **Explorez les fonctionnalités**
   - Navigation entre les onglets
   - Interface adaptée au type d'utilisateur
   - Déconnexion/reconnexion

## 🔧 Fonctionnalités de Développement

- ✅ **Carte Mapbox** (tuiles cohérentes avec Waze/Google) sur l'écran *Ma tournée*
- ✅ **Géocodage Mapbox** pour les adresses (aligne les pins sur la carte)
- ✅ **Bouton « Itinéraire »** au choix Waze / Google Maps (préférence mémorisée)
- ✅ **Recalcul GPS patients** : bouton dans le profil infirmière + script `npm run regeocode`
- ✅ **Comptes de test intégrés**
- ✅ **Remplissage automatique des formulaires**
- ✅ **Navigation adaptative selon le type d'utilisateur**
- ✅ **Déconnexion simplifiée**
- ✅ **Logs de debug activés**

## 📱 Navigation Testée

### Infirmière
```
Login → Dashboard → Patients → Tournée → Messages → Profil
```

### Patient/Famille
```
Login → Dashboard → Historique → Messages
```

---

*Prêt à tester SoinLokal en quelques clics !* 🎉

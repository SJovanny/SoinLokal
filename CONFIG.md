# Configuration de développement - SoinLokal

## 🔧 Variables d'environnement

### Firebase (Development)
```
FIREBASE_API_KEY=your-dev-api-key
FIREBASE_AUTH_DOMAIN=soinlokal-dev.firebaseapp.com
FIREBASE_PROJECT_ID=soinlokal-dev
FIREBASE_STORAGE_BUCKET=soinlokal-dev.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

### Firebase (Production)
```
FIREBASE_API_KEY=your-prod-api-key
FIREBASE_AUTH_DOMAIN=soinlokal.firebaseapp.com
FIREBASE_PROJECT_ID=soinlokal
FIREBASE_STORAGE_BUCKET=soinlokal.appspot.com
FIREBASE_MESSAGING_SENDER_ID=987654321
FIREBASE_APP_ID=1:987654321:web:fedcba654321
```

### Google Maps API
```
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

## 🚀 Scripts de build

### Development
```bash
# Démarrer en mode développement
npm start

# Build pour test
expo build:android --type apk
expo build:ios --type simulator
```

### Production
```bash
# Build pour production
expo build:android --type app-bundle
expo build:ios --type archive

# Utiliser EAS Build (recommandé)
eas build --platform android
eas build --platform ios
```

## 📱 Configuration des stores

### Google Play Store
- Package name: `com.soinlokal.app`
- Version code: Auto-increment
- Target SDK: 34 (Android 14)
- Permissions: Location, Camera, Storage

### Apple App Store
- Bundle ID: `com.soinlokal.app`
- Team ID: À configurer
- Provisioning Profile: À créer
- Capabilities: Location, Camera, HealthKit

## 🔒 Sécurité

### Certificates
- Android: Générer un keystore avec `keytool`
- iOS: Certificats de développement et distribution

### Obfuscation
```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (process.env.NODE_ENV === 'production') {
  config.transformer.minifierConfig = {
    keep_classnames: true,
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  };
}

module.exports = config;
```

## 🌐 Localisation

### Langues supportées
- Français (fr-FR) - Principal
- Créole martiniquais (gcf) - Futur
- Anglais (en-US) - Futur

### Configuration i18n
```javascript
// src/i18n/config.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: {
        translation: require('./locales/fr.json'),
      },
    },
    lng: 'fr',
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
```

## 📊 Analytics

### Firebase Analytics
```javascript
// src/utils/analytics.js
import { getAnalytics, logEvent } from 'firebase/analytics';

const analytics = getAnalytics();

export const logUserAction = (action, parameters) => {
  logEvent(analytics, action, parameters);
};
```

### Events à tracker
- `user_login`
- `appointment_created`
- `care_completed`
- `message_sent`
- `route_optimized`

## 🔔 Notifications Push

### Configuration
```javascript
// src/services/notifications.js
import { getMessaging, getToken } from 'firebase/messaging';

const messaging = getMessaging();

export const requestPermission = async () => {
  const token = await getToken(messaging, {
    vapidKey: 'your-vapid-key',
  });
  return token;
};
```

### Types de notifications
- Nouveau rendez-vous
- Rappel de soins
- Message reçu
- Changement de planning
- Urgence patient

## 🛡️ Monitoring

### Crash Reporting
```javascript
// src/services/crashlytics.js
import { getFunctions } from 'firebase/functions';

const functions = getFunctions();

export const logError = (error, context) => {
  // Log to Firebase Crashlytics
  console.error('Error:', error, 'Context:', context);
};
```

### Performance Monitoring
```javascript
// src/services/performance.js
import { getPerformance } from 'firebase/performance';

const perf = getPerformance();

export const startTrace = (name) => {
  return perf.trace(name);
};
```

## 📱 Tests

### Unit Tests
```bash
# Installer les dépendances de test
npm install --save-dev @testing-library/react-native jest

# Lancer les tests
npm test
```

### Integration Tests
```bash
# Installer Detox
npm install --save-dev detox

# Configuration Detox
detox build --configuration ios.sim.debug
detox test --configuration ios.sim.debug
```

## 🚀 Déploiement automatique

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Stores

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm test
      - name: Deploy to Expo
        run: expo publish
```

---

**Note importante :** Ce fichier contient des informations sensibles. Ne jamais commiter les vraies clés API dans le repository.

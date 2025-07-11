# 🚪 Fonctionnalité de Déconnexion - SoinLokal

## 📍 Emplacements des Boutons de Déconnexion

### 1. **Dashboard Infirmière**
- **Emplacement :** Header principal (icône en haut à droite)
- **Style :** Bouton icône discret avec bordure rouge
- **Action :** Confirmation + déconnexion immédiate

### 2. **Dashboard Patient/Famille**
- **Emplacement :** Header principal (icône en haut à droite)
- **Style :** Bouton icône discret avec bordure rouge
- **Action :** Confirmation + déconnexion immédiate

### 3. **Écran Profil Infirmière**
- **Emplacement :** En bas de l'écran
- **Style :** Bouton principal rouge avec texte
- **Action :** Confirmation personnalisée + déconnexion

## 🔄 Flux de Déconnexion

### Pour les Utilisateurs de Test
```
1. Utilisateur clique sur déconnexion
2. Alerte de confirmation avec nom personnalisé
3. Si confirmé → État local réinitialisé immédiatement
4. Retour automatique à l'écran de sélection de type d'utilisateur
```

### Pour les Utilisateurs Firebase
```
1. Utilisateur clique sur déconnexion
2. Alerte de confirmation avec nom personnalisé
3. Si confirmé → Appel Firebase signOut()
4. onAuthStateChanged déclenché automatiquement
5. État mis à jour → Retour à l'écran d'authentification
```

## 🎨 Styles de Boutons Disponibles

### `variant="icon"` (Headers)
- Icône seule dans un cercle
- Discret et peu encombrant
- Bordure colorée pour la visibilité

### `variant="danger"` (Profils)
- Bouton rouge avec texte
- Plus visible et intentionnel
- Pour les écrans dédiés aux paramètres

### `variant="minimal"` (Utilisation future)
- Texte simple avec icône
- Pour les menus ou sidebars

## 🛡 Sécurité et UX

### Confirmation Obligatoire
- Alerte native avec nom de l'utilisateur
- Bouton "Annuler" par défaut
- Bouton "Déconnexion" en style destructif

### Gestion d'Erreurs
- Try/catch pour toutes les opérations
- Fallback : réinitialisation forcée de l'état
- Message d'erreur utilisateur en cas de problème

### Personnalisation
- Message personnalisé avec prénom de l'utilisateur
- Différenciation visuelle selon le type de compte
- Badge "Test" visible pour les comptes de développement

## 🔧 Configuration Technique

### Composant LogoutButton
```javascript
<LogoutButton 
  variant="icon"           // Style du bouton
  showText={false}         // Afficher le texte
  style={customStyle}      // Styles personnalisés
  onLogoutStart={() => {}} // Callback avant déconnexion
  onLogoutComplete={() => {}} // Callback après déconnexion
/>
```

### AuthContext
- Détection automatique du type d'utilisateur (test vs Firebase)
- Logs de debug pour le développement
- Réinitialisation complète de l'état
- Navigation automatique vers l'authentification

## 📱 Interface Sans Headers

### Configuration Navigation
- `headerShown: false` sur tous les Tab.Navigator
- `screenOptions` globaux pour masquer les headers
- Style de tab bar personnalisé et cohérent
- Height optimisée pour l'accessibilité (60px)

### Avantages
- ✅ Interface plus moderne et épurée
- ✅ Plus d'espace pour le contenu
- ✅ Contrôle total sur les headers personnalisés
- ✅ Cohérence visuelle entre tous les écrans

## 🚀 Utilisation Rapide

1. **Développeur :** Les boutons sont automatiquement intégrés
2. **Test :** Utilisez les comptes de test pour tester la déconnexion
3. **UX :** L'expérience est fluide et sécurisée
4. **Navigation :** Retour automatique à l'écran d'authentification

---

*Déconnexion sécurisée et expérience utilisateur optimale pour SoinLokal* 🎉

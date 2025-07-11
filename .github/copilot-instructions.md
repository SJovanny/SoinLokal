# Copilot Instructions pour SoinLokal

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Contexte du projet
SoinLokal est une application mobile React Native destinée aux infirmières libérales en Martinique pour améliorer la gestion des soins à domicile.

## Technologies utilisées
- React Native avec Expo
- Firebase (Authentication, Firestore, Storage)
- React Navigation v6
- Google Maps API
- Styled Components ou NativeWind

## Structure du projet
- `/src/components` - Composants réutilisables
- `/src/screens` - Écrans de l'application
- `/src/navigation` - Configuration de la navigation
- `/src/services` - Services Firebase et API
- `/src/utils` - Utilitaires et helpers
- `/src/contexts` - Contextes React (Auth, Theme)
- `/src/hooks` - Hooks personnalisés

## Conventions de code
- Utiliser des composants fonctionnels avec hooks
- Nommer les fichiers en PascalCase pour les composants
- Utiliser TypeScript pour le type safety
- Suivre les conventions React Native et Expo

## Fonctionnalités principales
1. Authentification sécurisée (infirmières et patients)
2. Gestion des profils professionnels
3. Agenda et tableau de bord
4. Fiches patients avec historique
5. Géolocalisation et optimisation des tournées
6. Messagerie sécurisée
7. Suivi des soins et signatures numériques

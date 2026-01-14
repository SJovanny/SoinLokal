import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import CustomSplashScreen from './src/components/SplashScreen';

// Cacher immédiatement le splashscreen natif pour afficher directement le CustomSplashScreen
SplashScreen.hideAsync();
// Cacher immédiatement le splashscreen natif pour passer au vert
SplashScreen.hideAsync();

export default function App() {
  const [showCustomSplash, setShowCustomSplash] = useState(true);

  const handleSplashComplete = () => {
    setShowCustomSplash(false);
  };

  if (showCustomSplash) {
    return <CustomSplashScreen onAnimationComplete={handleSplashComplete} />;
  }

  return (
    <AuthProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}

if (typeof globalThis !== 'undefined' && !globalThis.matchMedia) {
  globalThis.matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { TamaguiProvider } from 'tamagui';
import config from './tamagui.config';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import CustomSplashScreen from './src/components/SplashScreen';

// Hide the native splash screen immediately so our custom one takes over
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
    <TamaguiProvider config={config} defaultTheme="light">
      <AuthProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </TamaguiProvider>
  );
}

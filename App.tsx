import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider } from 'tamagui';
import config from './tamagui.config';
import { AuthProvider } from './src/contexts/AuthContext';
import { MessageCountProvider } from './src/contexts/MessageCountContext';
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
    <SafeAreaProvider>
      <TamaguiProvider config={config} defaultTheme="light">
        <AuthProvider>
          <MessageCountProvider>
            <AppNavigator />
          </MessageCountProvider>
          <StatusBar style="auto" />
        </AuthProvider>
      </TamaguiProvider>
    </SafeAreaProvider>
  );
}

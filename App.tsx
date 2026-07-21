import './src/i18n';
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider } from 'tamagui';

import config from './tamagui.config';
import { AuthProvider } from './src/contexts/AuthContext';
import { MessageCountProvider } from './src/contexts/MessageCountContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import CustomSplashScreen from './src/components/SplashScreen';
import ErrorBoundary from './src/components/ErrorBoundary';

SplashScreen.hideAsync();

function ThemedApp(): React.JSX.Element | null {
  const { isDark, isReady } = useTheme();

  if (!isReady) return null;

  return (
    <TamaguiProvider config={config} defaultTheme={isDark ? 'dark' : 'light'}>
      <AuthProvider>
        <MessageCountProvider>
          <AppNavigator />
        </MessageCountProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </AuthProvider>
    </TamaguiProvider>
  );
}

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
      <ErrorBoundary>
        <ThemeProvider>
          <ThemedApp />
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'soinlokal.themePreference';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextType {
  isDark: boolean;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  isReady: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): React.JSX.Element {
  const systemScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'system' || stored === 'light' || stored === 'dark') {
          setThemePreferenceState(stored);
        }
      })
      .catch(() => {})
      .finally(() => setIsReady(true));
  }, []);

  const setThemePreference = useCallback((preference: ThemePreference) => {
    setThemePreferenceState(preference);
    AsyncStorage.setItem(STORAGE_KEY, preference).catch(() => {});
  }, []);

  const isDark =
    themePreference === 'system' ? systemScheme === 'dark' : themePreference === 'dark';

  const value = useMemo<ThemeContextType>(
    () => ({ isDark, themePreference, setThemePreference, isReady }),
    [isDark, themePreference, setThemePreference, isReady]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

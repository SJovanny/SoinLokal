import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'soinlokal.theme';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
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
  const [isDark, setIsDark] = useState<boolean>(false);
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!mounted) return;
        if (stored !== null) {
          setIsDark(stored === 'true');
        }
        setLoaded(true);
      })
      .catch(() => {
        if (mounted) setLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, String(next)).catch(() => {});
      return next;
    });
  };

  if (!loaded) return <>{children}</>;

  const value: ThemeContextType = { isDark, toggleTheme };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

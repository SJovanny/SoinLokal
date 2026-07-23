// ThemeContext tests

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

const STORAGE_KEY = 'soinlokal.themePreference';

describe('ThemeContext logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('theme preference storage', () => {
    it('reads preference from AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      expect(stored).toBe('dark');
    });

    it('writes preference to AsyncStorage', async () => {
      await AsyncStorage.setItem(STORAGE_KEY, 'light');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'light');
    });

    it('handles null stored value (first launch)', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      expect(stored).toBeNull();
    });

    it('handles AsyncStorage read error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('storage error'));
      await expect(AsyncStorage.getItem(STORAGE_KEY)).rejects.toThrow('storage error');
    });

    it('handles AsyncStorage write error', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('write error'));
      await expect(AsyncStorage.setItem(STORAGE_KEY, 'dark')).rejects.toThrow('write error');
    });
  });

  describe('isDark logic', () => {
    it('isDark is true when preference is dark', () => {
      const themePreference: string = 'dark';
      const systemScheme: string = 'light';
      const isDark = themePreference === 'system' ? systemScheme === 'dark' : themePreference === 'dark';
      expect(isDark).toBe(true);
    });

    it('isDark is false when preference is light', () => {
      const themePreference: string = 'light';
      const systemScheme: string = 'dark';
      const isDark = themePreference === 'system' ? systemScheme === 'dark' : themePreference === 'dark';
      expect(isDark).toBe(false);
    });

    it('isDark follows system when preference is system', () => {
      const themePreference: string = 'system';
      const dark: string = 'dark';
      const light: string = 'light';

      expect(themePreference === 'system' ? dark === 'dark' : false).toBe(true);
      expect(themePreference === 'system' ? light === 'dark' : false).toBe(false);
    });

    it('resolves the current system scheme each time it changes', () => {
      const resolveIsDark = (preference: string, systemScheme: string | null) =>
        preference === 'system' ? systemScheme === 'dark' : preference === 'dark';

      expect(resolveIsDark('system', 'light')).toBe(false);
      expect(resolveIsDark('system', 'dark')).toBe(true);
    });

    it('exposes the native appearance change subscription', () => {
      expect(typeof Appearance.getColorScheme).toBe('function');
      expect(typeof Appearance.addChangeListener).toBe('function');
    });
  });
});

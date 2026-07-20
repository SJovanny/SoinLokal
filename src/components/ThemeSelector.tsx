import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type ThemePreference } from '../contexts/ThemeContext';
import { getColors, SIZES } from '../utils/constants';

interface ThemeSelectorProps {
  accentColor?: string;
}

const OPTIONS: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'system', label: 'Système', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Clair', icon: 'sunny-outline' },
  { value: 'dark', label: 'Sombre', icon: 'moon-outline' },
];

export default function ThemeSelector({ accentColor }: ThemeSelectorProps) {
  const { isDark, themePreference, setThemePreference } = useTheme();
  const colors = getColors(isDark);
  const resolvedAccent = accentColor ?? colors.NURSE_PRIMARY;
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Ionicons name="contrast-outline" size={22} color={resolvedAccent} />
        <Text style={styles.title}>Apparence</Text>
      </View>

      <View style={styles.optionsRow}>
        {OPTIONS.map((option) => {
          const isSelected = themePreference === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                isSelected && { borderColor: resolvedAccent, backgroundColor: `${resolvedAccent}14` },
              ]}
              onPress={() => setThemePreference(option.value)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={option.icon}
                size={20}
                color={isSelected ? resolvedAccent : colors.TEXT_MUTED}
              />
              <Text style={[styles.optionLabel, isSelected && { color: resolvedAccent }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
    section: {
      backgroundColor: colors.WHITE,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      padding: SIZES.MD,
      marginBottom: SIZES.MD,
      shadowColor: colors.BLACK,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SIZES.SM,
      marginBottom: SIZES.MD,
    },
    title: {
      fontSize: SIZES.FONT_LG,
      fontWeight: '700',
      color: colors.TEXT_PRIMARY,
    },
    optionsRow: {
      flexDirection: 'row',
      gap: SIZES.SM,
    },
    option: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
      paddingVertical: SIZES.MD,
      borderRadius: SIZES.BORDER_RADIUS_SM,
      borderWidth: 1.5,
      borderColor: colors.BORDER,
    },
    optionLabel: {
      fontSize: SIZES.FONT_XS,
      fontWeight: '600',
      color: colors.TEXT_SECONDARY,
    },
  });
}

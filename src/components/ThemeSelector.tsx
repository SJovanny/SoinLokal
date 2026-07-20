import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type ThemePreference } from '../contexts/ThemeContext';
import { COLORS, SIZES } from '../utils/constants';

interface ThemeSelectorProps {
  accentColor?: string;
}

const OPTIONS: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'system', label: 'Système', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Clair', icon: 'sunny-outline' },
  { value: 'dark', label: 'Sombre', icon: 'moon-outline' },
];

export default function ThemeSelector({ accentColor = COLORS.NURSE_PRIMARY }: ThemeSelectorProps) {
  const { themePreference, setThemePreference } = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Ionicons name="contrast-outline" size={22} color={accentColor} />
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
                isSelected && { borderColor: accentColor, backgroundColor: `${accentColor}14` },
              ]}
              onPress={() => setThemePreference(option.value)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={option.icon}
                size={20}
                color={isSelected ? accentColor : COLORS.TEXT_MUTED}
              />
              <Text style={[styles.optionLabel, isSelected && { color: accentColor }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: COLORS.WHITE,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    padding: SIZES.MD,
    marginBottom: SIZES.MD,
    shadowColor: COLORS.BLACK,
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
    color: COLORS.TEXT_PRIMARY,
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
    borderColor: COLORS.BORDER,
  },
  optionLabel: {
    fontSize: SIZES.FONT_XS,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
});

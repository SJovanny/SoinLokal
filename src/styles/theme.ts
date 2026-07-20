import { COLORS } from '../utils/constants';

export const COLORS_DARK = {
  BACKGROUND:     '#0F0F1A',
  SURFACE:        '#1A1A2E',
  WHITE:          '#1A1A2E',
  BORDER:         '#2A2A4A',
  TEXT_PRIMARY:   '#E8E8F0',
  TEXT_SECONDARY: '#A0A0B8',
  TEXT_MUTED:     '#6B6B8A',
  BLACK:          '#FFFFFF',
} as const;

export function getThemeColors(isDark: boolean): { [K in keyof typeof COLORS]: string } {
  if (!isDark) return COLORS;

  return {
    ...COLORS,
    ...COLORS_DARK,
  };
}

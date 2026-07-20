// Constantes de configuration pour SoinLokal

// ---------------------------------------------------------------------------
// Colors — mirrors Tamagui config tokens; safe for RN StyleSheet contexts
// ---------------------------------------------------------------------------

export const COLORS = {
  // Role themes
  NURSE_PRIMARY:   '#2E8B57',
  NURSE_LIGHT:     '#E8F5EE',
  NURSE_DARK:      '#1B5E20',
  PATIENT_PRIMARY: '#4A90E2',
  PATIENT_LIGHT:   '#EBF4FF',
  PATIENT_DARK:    '#1A5FA8',
  FAMILY_PRIMARY:  '#7C4DFF',
  FAMILY_LIGHT:    '#EDE7F6',
  FAMILY_DARK:     '#4A148C',

  // Semantic
  SUCCESS: '#4CAF50',
  WARNING: '#FF9800',
  DANGER:  '#F44336',
  INFO:    '#2196F3',

  // Neutrals
  WHITE:          '#FFFFFF',
  BLACK:          '#000000',
  BACKGROUND:     '#F8F9FA',
  SURFACE:        '#FFFFFF',
  BORDER:         '#E0E0E0',
  TEXT_PRIMARY:   '#1A1A2E',
  TEXT_SECONDARY: '#64748B',
  TEXT_MUTED:     '#94A3B8',
} as const;

export type ColorKey = keyof typeof COLORS;

// ---------------------------------------------------------------------------
// Sizes — mirrors Tamagui config tokens; safe for RN StyleSheet contexts
// ---------------------------------------------------------------------------

export const SIZES = {
  // Spacing
  XS:   4,
  SM:   8,
  MD:   16,
  LG:   20,
  XL:   24,
  XXL:  32,
  XXXL: 48,

  // Border radii
  BORDER_RADIUS_SM:   8,
  BORDER_RADIUS_MD:   12,
  BORDER_RADIUS_LG:   16,
  BORDER_RADIUS_FULL: 9999,

  // Component heights
  INPUT_HEIGHT:  52,
  BUTTON_HEIGHT: 52,

  // Typography
  FONT_XS:  12,
  FONT_SM:  14,
  FONT_MD:  16,
  FONT_LG:  18,
  FONT_XL:  22,
  FONT_2XL: 28,
} as const;

export type SizeKey = keyof typeof SIZES;

// ---------------------------------------------------------------------------
// Dark theme color overrides
// ---------------------------------------------------------------------------

export const DARK_OVERRIDES = {
  NURSE_PRIMARY:   '#4CAF7D',
  NURSE_LIGHT:     '#1B3A2C',
  NURSE_DARK:      '#2E8B57',
  PATIENT_PRIMARY: '#6BA3E8',
  PATIENT_LIGHT:   '#1A2B3D',
  PATIENT_DARK:    '#4A90E2',
  FAMILY_PRIMARY:  '#9575FF',
  FAMILY_LIGHT:    '#2A1F3D',
  FAMILY_DARK:     '#7C4DFF',

  SUCCESS: '#66BB6A',
  WARNING: '#FFA726',
  DANGER:  '#EF5350',
  INFO:    '#42A5F5',

  BACKGROUND:     '#0F0F1A',
  SURFACE:        '#1A1A2E',
  WHITE:          '#1A1A2E',
  BORDER:         '#2A2A4A',
  TEXT_PRIMARY:   '#E8E8F0',
  TEXT_SECONDARY: '#A0A0B8',
  TEXT_MUTED:     '#6B6B8A',
  BLACK:          '#FFFFFF',
} as const;

export function getColors(isDark: boolean): { [K in keyof typeof COLORS]: string } {
  if (!isDark) return COLORS;
  return { ...COLORS, ...DARK_OVERRIDES };
}

// Theme helper
// ---------------------------------------------------------------------------

export function getThemeColor(userType: 'nurse' | 'patient' | 'family' | string): string {
  if (userType === 'nurse') return COLORS.NURSE_PRIMARY;
  if (userType === 'family') return COLORS.FAMILY_PRIMARY;
  return COLORS.PATIENT_PRIMARY;
}

// ---------------------------------------------------------------------------
// Domain data arrays
// ---------------------------------------------------------------------------

export const STRASBOURG_QUARTIERS: string[] = [
  'Centre-ville',
  'Grande Île',
  'Neudorf',
  'Cronenbourg',
  'Kutenau',
  'Esplanade',
  'Halles',
  'Gare',
  'Contades',
  'Robertsau',
  'Wacken',
  'Meinau',
  'Neuhof',
  'Elsau',
  'Montagne Verte',
  'Port du Rhin',
  'Schiltigheim',
  'Illkirch-Graffenstaden',
  'Bischheim',
  'Lingolsheim',
  'Ostwald',
  'Hoenheim',
];

export const CARE_TYPES: string[] = [
  'Pansement',
  'Injection',
  'Prise de sang',
  'Contrôle glycémie',
  'Contrôle tension',
  'Soins post-opératoires',
  'Toilette patient',
  'Perfusion',
  'Médicaments',
  'Kinésithérapie',
  'Soins palliatifs',
  'Surveillance',
];

export const NURSE_SPECIALTIES: string[] = [
  'Soins généraux',
  'Soins palliatifs',
  'Diabétologie',
  'Cardiologie',
  'Pédiatrie',
  'Gériatrie',
  'Psychiatrie',
  'Plaies et cicatrisation',
  'Perfusions',
  'Chimiothérapie',
  'Soins post-opératoires',
  'Rééducation',
];

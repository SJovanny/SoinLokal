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
// Theme helper
// ---------------------------------------------------------------------------

export function getThemeColor(userType: 'nurse' | 'patient' | string): string {
  return userType === 'nurse' ? COLORS.NURSE_PRIMARY : COLORS.PATIENT_PRIMARY;
}

// ---------------------------------------------------------------------------
// Domain data arrays
// ---------------------------------------------------------------------------

export const MARTINIQUE_COMMUNES: string[] = [
  'Fort-de-France',
  'Schoelcher',
  'Lamentin',
  'Saint-Pierre',
  'Saint-Joseph',
  'Ducos',
  'Rivière-Pilote',
  'Rivière-Salée',
  'Sainte-Anne',
  'Sainte-Luce',
  'Trois-Îlets',
  "Anses-d'Arlet",
  'Diamant',
  'Saint-Esprit',
  'François',
  'Vauclin',
  'Marin',
  'Case-Pilote',
  'Carbet',
  'Bellefontaine',
  'Morne-Rouge',
  'Gros-Morne',
  'Trinité',
  'Sainte-Marie',
  'Macouba',
  'Basse-Pointe',
  'Lorrain',
  'Marigot',
  'Robert',
  'Prêcheur',
  "Grand'Rivière",
  'Ajoupa-Bouillon',
  'Morne-Vert',
  'Fonds-Saint-Denis',
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

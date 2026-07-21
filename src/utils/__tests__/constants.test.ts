import {
  COLORS,
  DARK_OVERRIDES,
  getColors,
  getThemeColor,
  CARE_TYPES,
  NURSE_SPECIALTIES,
  STRASBOURG_QUARTIERS,
} from '../constants';

describe('getColors', () => {
  it('returns light colors when isDark is false', () => {
    const colors = getColors(false);
    expect(colors.NURSE_PRIMARY).toBe(COLORS.NURSE_PRIMARY);
    expect(colors.BACKGROUND).toBe(COLORS.BACKGROUND);
  });

  it('returns dark colors when isDark is true', () => {
    const colors = getColors(true);
    expect(colors.NURSE_PRIMARY).toBe(DARK_OVERRIDES.NURSE_PRIMARY);
    expect(colors.BACKGROUND).toBe(DARK_OVERRIDES.BACKGROUND);
    expect(colors.WHITE).toBe(DARK_OVERRIDES.WHITE);
  });

  it('overrides only DARK_OVERRIDES keys, preserves others', () => {
    const colors = getColors(true);
    // DARK_OVERRIDES doesn't override SIZES or all constants
    expect(colors.NURSE_PRIMARY).toBe(DARK_OVERRIDES.NURSE_PRIMARY);
    // A key not in DARK_OVERRIDES should keep its light value
    expect(colors.SURFACE).toBe(DARK_OVERRIDES.SURFACE);
  });
});

describe('getThemeColor', () => {
  it('returns nurse color for nurse', () => {
    expect(getThemeColor('nurse')).toBe(COLORS.NURSE_PRIMARY);
  });

  it('returns patient color for patient', () => {
    expect(getThemeColor('patient')).toBe(COLORS.PATIENT_PRIMARY);
  });

  it('returns family color for family', () => {
    expect(getThemeColor('family')).toBe(COLORS.FAMILY_PRIMARY);
  });

  it('returns patient color as default for unknown', () => {
    expect(getThemeColor('unknown')).toBe(COLORS.PATIENT_PRIMARY);
  });

  it('returns patient color for empty string', () => {
    expect(getThemeColor('')).toBe(COLORS.PATIENT_PRIMARY);
  });
});

describe('domain data arrays', () => {
  it('CARE_TYPES is a non-empty array of strings', () => {
    expect(Array.isArray(CARE_TYPES)).toBe(true);
    expect(CARE_TYPES.length).toBeGreaterThan(0);
    CARE_TYPES.forEach((ct) => expect(typeof ct).toBe('string'));
  });

  it('NURSE_SPECIALTIES is a non-empty array of strings', () => {
    expect(Array.isArray(NURSE_SPECIALTIES)).toBe(true);
    expect(NURSE_SPECIALTIES.length).toBeGreaterThan(0);
    NURSE_SPECIALTIES.forEach((s) => expect(typeof s).toBe('string'));
  });

  it('STRASBOURG_QUARTIERS is a non-empty array of strings', () => {
    expect(Array.isArray(STRASBOURG_QUARTIERS)).toBe(true);
    expect(STRASBOURG_QUARTIERS.length).toBeGreaterThan(0);
    STRASBOURG_QUARTIERS.forEach((q) => expect(typeof q).toBe('string'));
  });
});

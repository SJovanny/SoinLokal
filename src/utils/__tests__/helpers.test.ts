import {
  validateEmail,
  validatePhone,
  formatPhone,
  calculateDistance,
  estimateTravelTime,
  formatDate,
  formatTime,
  formatDateTime,
  generateId,
  handleAuthError,
  optimizeRoute,
} from '../helpers';

// ---------------------------------------------------------------------------
// validateEmail
// ---------------------------------------------------------------------------
describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name@domain.co')).toBe(true);
    expect(validateEmail('a+b@c.com')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('notanemail')).toBe(false);
    expect(validateEmail('@no-local.com')).toBe(false);
    expect(validateEmail('no-at-sign.com')).toBe(false);
    expect(validateEmail('user@.com')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validatePhone
// ---------------------------------------------------------------------------
describe('validatePhone', () => {
  it('accepts valid French numbers', () => {
    expect(validatePhone('0612345678')).toBe(true);
    expect(validatePhone('+33612345678')).toBe(true);
    expect(validatePhone('06 12 34 56 78')).toBe(true);
    expect(validatePhone('+33 6 12 34 56 78')).toBe(true);
  });

  it('rejects invalid numbers', () => {
    expect(validatePhone('')).toBe(false);
    expect(validatePhone('12345678')).toBe(false);
    expect(validatePhone('0012345678')).toBe(false);
    expect(validatePhone('abcdefghij')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formatPhone
// ---------------------------------------------------------------------------
describe('formatPhone', () => {
  it('formats 10-digit numbers', () => {
    expect(formatPhone('0612345678')).toBe('06 12 34 56 78');
  });

  it('returns original if not 10 digits', () => {
    expect(formatPhone('+33612345678')).toBe('+33612345678');
    expect(formatPhone('123')).toBe('123');
  });
});

// ---------------------------------------------------------------------------
// calculateDistance (Haversine)
// ---------------------------------------------------------------------------
describe('calculateDistance', () => {
  it('returns 0 for same point', () => {
    expect(calculateDistance(14.6, -61.0, 14.6, -61.0)).toBe(0);
  });

  it('calculates distance between two known points', () => {
    // Fort-de-France to Saint-Pierre, Martinique ≈ 15 km
    const dist = calculateDistance(14.6037, -61.0732, 14.7475, -61.1753);
    expect(dist).toBeGreaterThan(10);
    expect(dist).toBeLessThan(25);
  });

  it('is symmetric', () => {
    const d1 = calculateDistance(14.6, -61.0, 14.7, -61.1);
    const d2 = calculateDistance(14.7, -61.1, 14.6, -61.0);
    expect(d1).toBeCloseTo(d2, 5);
  });
});

// ---------------------------------------------------------------------------
// estimateTravelTime
// ---------------------------------------------------------------------------
describe('estimateTravelTime', () => {
  it('returns 0 for 0 km', () => {
    expect(estimateTravelTime(0)).toBe(0);
  });

  it('calculates time at average 35 km/h', () => {
    // 35 km at 35 km/h = 60 minutes
    expect(estimateTravelTime(35)).toBe(60);
  });

  it('rounds correctly', () => {
    // 10 km at 35 km/h ≈ 17.14 → 17
    expect(estimateTravelTime(10)).toBe(17);
  });
});

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------
describe('formatDate', () => {
  it('formats a date string in French', () => {
    const result = formatDate('2025-01-15');
    expect(result).toContain('2025');
    expect(result).toContain('janvier');
    expect(result).toContain('15');
  });

  it('formats a Date object', () => {
    const result = formatDate(new Date(2025, 5, 20));
    expect(result).toContain('2025');
    expect(result).toContain('juin');
  });
});

describe('formatTime', () => {
  it('formats time from date string', () => {
    const result = formatTime('2025-01-15T14:30:00');
    expect(result).toMatch(/14h30|14:30/);
  });
});

describe('formatDateTime', () => {
  it('formats date and time together', () => {
    const result = formatDateTime('2025-01-15T14:30:00');
    expect(result).toContain('2025');
    expect(result).toMatch(/14h30|14:30/);
  });
});

// ---------------------------------------------------------------------------
// generateId
// ---------------------------------------------------------------------------
describe('generateId', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('returns unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// handleAuthError
// ---------------------------------------------------------------------------
describe('handleAuthError', () => {
  it('handles rate limit message', () => {
    expect(handleAuthError({ message: 'rate limit exceeded' })).toContain(
      'patienter',
    );
  });

  it('handles invalid email message', () => {
    expect(handleAuthError({ message: 'invalid email format' })).toContain(
      'invalide',
    );
  });

  it('handles invalid_credentials code', () => {
    expect(handleAuthError({ code: 'invalid_credentials' })).toBe(
      'Email ou mot de passe incorrect',
    );
  });

  it('handles email_already_exists code', () => {
    expect(handleAuthError({ code: 'email_already_exists' })).toContain(
      'déjà utilisée',
    );
  });

  it('handles weak_password code', () => {
    expect(handleAuthError({ code: 'weak_password' })).toContain('6 caractères');
  });

  it('handles user_not_found code', () => {
    expect(handleAuthError({ code: 'user_not_found' })).toContain('Aucun compte');
  });

  it('handles email_not_confirmed code', () => {
    expect(handleAuthError({ code: 'email_not_confirmed' })).toContain('confirmer');
  });

  it('handles network_failure code', () => {
    expect(handleAuthError({ code: 'network_failure' })).toContain('internet');
  });

  it('handles over_email_send_rate_limit code', () => {
    expect(handleAuthError({ code: 'over_email_send_rate_limit' })).toContain(
      'patienter',
    );
  });

  it('handles email_rate_limit_exceeded code', () => {
    expect(handleAuthError({ code: 'email_rate_limit_exceeded' })).toContain(
      'patienter',
    );
  });

  it('handles email_address_invalid code', () => {
    expect(handleAuthError({ code: 'email_address_invalid' })).toContain('invalide');
  });

  it('handles invalid_email code', () => {
    expect(handleAuthError({ code: 'invalid_email' })).toContain('invalide');
  });

  it('falls back to error message for unknown codes', () => {
    expect(
      handleAuthError({ code: 'something_unknown', message: 'Custom error' }),
    ).toBe('Custom error');
  });

  it('falls back to default message when nothing provided', () => {
    expect(handleAuthError({})).toBe('Une erreur est survenue');
  });
});

// ---------------------------------------------------------------------------
// optimizeRoute
// ---------------------------------------------------------------------------
describe('optimizeRoute', () => {
  const base = { latitude: 14.6, longitude: -61.0 };

  it('returns empty array for empty input', () => {
    expect(optimizeRoute(base, [])).toEqual([]);
  });

  it('returns single patient with travel time', () => {
    const patients = [{ latitude: 14.7, longitude: -61.1 }];
    const result = optimizeRoute(base, patients);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('estimatedTravelTime');
    expect(result[0].estimatedTravelTime).toBeGreaterThanOrEqual(0);
  });

  it('orders patients by nearest-neighbour heuristic', () => {
    const patients = [
      { latitude: 14.9, longitude: -61.3, id: 'far' },
      { latitude: 14.61, longitude: -61.01, id: 'near' },
      { latitude: 14.7, longitude: -61.1, id: 'mid' },
    ];
    const result = optimizeRoute(base, patients);
    expect(result).toHaveLength(3);
    // First stop should be the nearest one
    expect(result[0].id).toBe('near');
  });

  it('preserves patient data in output', () => {
    const patients = [{ latitude: 14.7, longitude: -61.1, name: 'Test Patient' }];
    const result = optimizeRoute(base, patients);
    expect(result[0].name).toBe('Test Patient');
  });
});

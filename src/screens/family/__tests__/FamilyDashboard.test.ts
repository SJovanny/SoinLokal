import { formatNurseNames } from '../familyDashboardHelpers';

describe('formatNurseNames', () => {
  it('keeps all nurses assigned to a managed patient', () => {
    expect(formatNurseNames([
      { first_name: 'Alice', last_name: 'Martin' },
      { first_name: 'Béatrice', last_name: 'Durand' },
    ])).toBe('Alice Martin, Béatrice Durand');
  });

  it('returns null when no nurse is assigned', () => {
    expect(formatNurseNames([])).toBeNull();
  });
});

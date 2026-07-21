const mockFrom = jest.fn();

jest.mock('../../utils/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { buildPatientExportData } from '../dataExport';

function buildChain(result: { data?: unknown; error?: unknown }) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    then: (resolve: (v: { data?: unknown; error?: unknown }) => void) => resolve(result),
  };
}

describe('buildPatientExportData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty arrays when patientProfile is null', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return buildChain({ data: { id: 'u1', first_name: 'Test' } });
      if (table === 'patient_profiles') return buildChain({ data: null });
      return buildChain({ data: null });
    });

    const result = await buildPatientExportData('u1');
    expect(result.patientProfile).toBeNull();
    expect(result.patientFiles).toEqual([]);
    expect(result.appointments).toEqual([]);
    expect(result.messages).toEqual([]);
    expect(result.exportedAt).toBeTruthy();
  });

  it('returns data when patientProfile exists', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          ...buildChain({ data: { id: 'u1', first_name: 'Test', last_name: 'User' } }),
          // Override for the second call (author lookup)
          in: jest.fn().mockResolvedValue({
            data: [{ id: 'n1', first_name: 'Nurse', last_name: 'One' }],
          }),
        };
      }
      if (table === 'patient_profiles') return buildChain({ data: { id: 'p1', profile_id: 'u1' } });
      if (table === 'patient_files') return buildChain({ data: [{ id: 'f1', patient_id: 'p1' }] });
      if (table === 'appointments') return buildChain({ data: [{ id: 'a1', date: '2025-01-01' }] });
      if (table === 'messages') {
        return buildChain({
          data: [{ author_id: 'n1', content: 'Hello', created_at: '2025-01-01T10:00:00Z' }],
        });
      }
      return buildChain({ data: null });
    });

    const result = await buildPatientExportData('u1');
    expect(result.patientProfile).toBeTruthy();
    expect(result.exportedAt).toBeTruthy();
  });

  it('handles empty patientFiles', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return buildChain({ data: { id: 'u1' } });
      if (table === 'patient_profiles') return buildChain({ data: { id: 'p1' } });
      if (table === 'patient_files') return buildChain({ data: [] });
      return buildChain({ data: [] });
    });

    const result = await buildPatientExportData('u1');
    expect(result.appointments).toEqual([]);
    expect(result.messages).toEqual([]);
  });
});

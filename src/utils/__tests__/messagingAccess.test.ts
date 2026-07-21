const mockFrom = jest.fn();

jest.mock('../../utils/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { resolveAccessibleFileIds, countUnreadMessages } from '../messagingAccess';

function buildChain(result: { data?: unknown; error?: unknown }) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    then: (resolve: (v: { data?: unknown; error?: unknown }) => void) => resolve(result),
  };
}

describe('resolveAccessibleFileIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves files for nurse role', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'patient_files') {
        return buildChain({
          data: [
            { id: 'f1', patient_id: 'p1' },
            { id: 'f2', patient_id: 'p2' },
          ],
        });
      }
      if (table === 'profiles') {
        return buildChain({
          data: [
            { id: 'p1', first_name: 'Alice', last_name: 'A', photo_url: null, avatar_type: null, avatar_seed: null },
            { id: 'p2', first_name: 'Bob', last_name: 'B', photo_url: null, avatar_type: null, avatar_seed: null },
          ],
        });
      }
      if (table === 'patient_profiles') {
        return buildChain({ data: [] });
      }
      return buildChain({ data: null });
    });

    const result = await resolveAccessibleFileIds(
      { id: 'n1' },
      { user_type: 'nurse' },
      [],
    );

    expect(result.fileIds).toEqual(['f1', 'f2']);
    expect(result.fileInfoMap['f1'].participantName).toBe('Alice A');
    expect(result.fileInfoMap['f2'].participantName).toBe('Bob B');
    expect(result.fileInfoMap['f1'].participantSubtitle).toBe('Patient');
  });

  it('resolves files for patient role', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'patient_files') {
        return buildChain({ data: [{ id: 'f1', nurse_id: 'n1' }] });
      }
      if (table === 'profiles') {
        return buildChain({
          data: [{ id: 'n1', first_name: 'Nurse', last_name: 'One', photo_url: null, avatar_type: null, avatar_seed: null }],
        });
      }
      return buildChain({ data: null });
    });

    const result = await resolveAccessibleFileIds(
      { id: 'p1' },
      { user_type: 'patient' },
      [],
    );

    expect(result.fileIds).toEqual(['f1']);
    expect(result.fileInfoMap['f1'].participantName).toBe('Nurse One');
    expect(result.fileInfoMap['f1'].participantSubtitle).toBe('Infirmière');
  });

  it('resolves files for family role with links', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'patient_files') {
        return buildChain({
          data: [{ id: 'f1', patient_id: 'p1', nurse_id: 'n1' }],
        });
      }
      if (table === 'profiles') {
        return buildChain({
          data: [
            { id: 'n1', first_name: 'Nurse', last_name: 'One', photo_url: null, avatar_type: null, avatar_seed: null },
            { id: 'p1', first_name: 'Patient', last_name: 'One', photo_url: null, avatar_type: null, avatar_seed: null },
          ],
        });
      }
      if (table === 'patient_profiles') {
        return buildChain({ data: [] });
      }
      return buildChain({ data: null });
    });

    const result = await resolveAccessibleFileIds(
      { id: 'fam1' },
      { user_type: 'family' },
      [{ patient_file_id: 'f1' } as any],
    );

    expect(result.fileIds).toEqual(['f1']);
    expect(result.fileInfoMap['f1'].participantName).toBe('Nurse One');
  });

  it('returns empty for family with no links and no managed', async () => {
    mockFrom.mockImplementation(() => buildChain({ data: [] }));

    const result = await resolveAccessibleFileIds(
      { id: 'fam1' },
      { user_type: 'family' },
      [],
    );

    expect(result.fileIds).toEqual([]);
  });

  it('marks managed patients correctly', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'patient_files') {
        return buildChain({ data: [] });
      }
      if (table === 'patient_profiles') {
        // First call: get managed profiles, second call: get managed files
        return {
          ...buildChain({ data: [{ profile_id: 'p_managed' }] }),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
        };
      }
      if (table === 'profiles') {
        return buildChain({
          data: [
            { id: 'p_managed', first_name: 'Managed', last_name: 'Patient', photo_url: null, avatar_type: null, avatar_seed: null },
            { id: 'n1', first_name: 'Nurse', last_name: 'One', photo_url: null, avatar_type: null, avatar_seed: null },
          ],
        });
      }
      return buildChain({ data: null });
    });

    const result = await resolveAccessibleFileIds(
      { id: 'fam1' },
      { user_type: 'family' },
      [],
    );

    // Should attempt to resolve managed patients
    expect(mockFrom).toHaveBeenCalledWith('patient_profiles');
  });
});

describe('countUnreadMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 0 for empty fileIds', async () => {
    const count = await countUnreadMessages('u1', [], {});
    expect(count).toBe(0);
  });

  it('counts unread messages excluding own', async () => {
    mockFrom.mockReturnValue(
      buildChain({
        data: [
          { patient_file_id: 'f1', author_id: 'other' },
          { patient_file_id: 'f1', author_id: 'me' },
          { patient_file_id: 'f1', author_id: 'other2' },
        ],
      }),
    );

    const count = await countUnreadMessages('me', ['f1'], {
      f1: { isManaged: false } as any,
    });

    expect(count).toBe(2); // other + other2, not 'me'
  });

  it('excludes messages from proxy patient', async () => {
    mockFrom.mockReturnValue(
      buildChain({
        data: [
          { patient_file_id: 'f1', author_id: 'proxy_patient_id' },
          { patient_file_id: 'f1', author_id: 'other' },
        ],
      }),
    );

    const count = await countUnreadMessages('fam1', ['f1'], {
      f1: { isManaged: true, patientId: 'proxy_patient_id' } as any,
    });

    expect(count).toBe(1); // only 'other', not the proxy patient
  });

  it('returns 0 when no unread messages', async () => {
    mockFrom.mockReturnValue(buildChain({ data: null }));

    const count = await countUnreadMessages('u1', ['f1'], {});
    expect(count).toBe(0);
  });
});

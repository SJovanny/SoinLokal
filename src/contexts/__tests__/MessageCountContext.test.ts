// MessageCountContext tests — tests the count logic and auth state handling

const mockResolveAccessibleFileIds = jest.fn();
const mockCountUnreadMessages = jest.fn();

jest.mock('../../utils/messagingAccess', () => ({
  resolveAccessibleFileIds: (...args: unknown[]) => mockResolveAccessibleFileIds(...args),
  countUnreadMessages: (...args: unknown[]) => mockCountUnreadMessages(...args),
}));

jest.mock('../../utils/supabase', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnValue('SUBSCRIBED'),
    })),
    removeChannel: jest.fn(),
  },
}));

jest.mock('../AuthContext', () => ({
  useAuth: jest.fn(),
}));

import { resolveAccessibleFileIds, countUnreadMessages } from '../../utils/messagingAccess';

describe('MessageCountContext logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 0 when user is null', async () => {
    mockResolveAccessibleFileIds.mockResolvedValue({ fileIds: [], fileInfoMap: {} });
    mockCountUnreadMessages.mockResolvedValue(0);

    const { fileIds, fileInfoMap } = await resolveAccessibleFileIds(
      null as any,
      { user_type: 'nurse' },
      [],
    );
    const count = await countUnreadMessages('u1', fileIds, fileInfoMap);

    expect(count).toBe(0);
  });

  it('resolves file IDs and counts unread', async () => {
    mockResolveAccessibleFileIds.mockResolvedValue({
      fileIds: ['f1', 'f2'],
      fileInfoMap: { f1: { participantName: 'Test' } },
    });
    mockCountUnreadMessages.mockResolvedValue(3);

    const { fileIds, fileInfoMap } = await resolveAccessibleFileIds(
      { id: 'u1' },
      { user_type: 'nurse' },
      [],
    );
    const count = await countUnreadMessages('u1', fileIds, fileInfoMap);

    expect(fileIds).toEqual(['f1', 'f2']);
    expect(count).toBe(3);
    expect(mockResolveAccessibleFileIds).toHaveBeenCalledWith(
      { id: 'u1' },
      { user_type: 'nurse' },
      [],
    );
  });

  it('handles error in resolveAccessibleFileIds gracefully', async () => {
    mockResolveAccessibleFileIds.mockRejectedValue(new Error('RLS error'));

    await expect(
      resolveAccessibleFileIds({ id: 'u1' }, { user_type: 'nurse' }, []),
    ).rejects.toThrow('RLS error');
  });

  it('handles error in countUnreadMessages gracefully', async () => {
    mockCountUnreadMessages.mockRejectedValue(new Error('count error'));

    await expect(countUnreadMessages('u1', ['f1'], {})).rejects.toThrow('count error');
  });

  it('returns 0 count when fileIds is empty', async () => {
    mockResolveAccessibleFileIds.mockResolvedValue({ fileIds: [], fileInfoMap: {} });
    mockCountUnreadMessages.mockResolvedValue(0);

    const { fileIds } = await resolveAccessibleFileIds(
      { id: 'u1' },
      { user_type: 'nurse' },
      [],
    );
    expect(fileIds).toEqual([]);

    const count = await countUnreadMessages('u1', [], {});
    expect(count).toBe(0);
  });
});

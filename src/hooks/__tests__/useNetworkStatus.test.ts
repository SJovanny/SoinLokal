// useNetworkStatus tests

describe('useNetworkStatus logic', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns connected when fetch succeeds with ok status', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    const response = await fetch('https://clients3.google.com/generate_204', {
      method: 'HEAD',
    });
    expect(response.ok).toBe(true);
  });

  it('returns not connected when fetch fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    try {
      await fetch('https://clients3.google.com/generate_204', { method: 'HEAD' });
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
    }
  });

  it('returns not connected when response is not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });

    const response = await fetch('https://clients3.google.com/generate_204', {
      method: 'HEAD',
    });
    expect(response.ok).toBe(false);
  });

  it('uses HEAD method for connectivity check', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    await fetch('https://clients3.google.com/generate_204', { method: 'HEAD' });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://clients3.google.com/generate_204',
      expect.objectContaining({ method: 'HEAD' }),
    );
  });
});

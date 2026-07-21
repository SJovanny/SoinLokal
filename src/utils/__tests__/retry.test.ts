import { withRetry } from '../retry';

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and eventually succeeds', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    const result = await withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 1,
      backoffMultiplier: 1,
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after maxRetries exhausted', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('always fails'));
    const onRetry = jest.fn();

    await expect(
      withRetry(fn, {
        maxRetries: 2,
        baseDelayMs: 1,
        backoffMultiplier: 1,
        onRetry,
      }),
    ).rejects.toThrow('always fails');

    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('calls onRetry callback with attempt number and error', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('err'))
      .mockResolvedValue('ok');
    const onRetry = jest.fn();

    await withRetry(fn, {
      maxRetries: 1,
      baseDelayMs: 1,
      backoffMultiplier: 1,
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });

  it('wraps non-Error throws into Error', async () => {
    const fn = jest.fn().mockRejectedValue('string error');
    const onRetry = jest.fn();

    await expect(
      withRetry(fn, {
        maxRetries: 1,
        baseDelayMs: 1,
        backoffMultiplier: 1,
        onRetry,
      }),
    ).rejects.toThrow('string error');

    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });

  it('respects maxDelayMs', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const result = await withRetry(fn, {
      maxRetries: 1,
      baseDelayMs: 1,
      maxDelayMs: 5,
      backoffMultiplier: 1,
    });

    expect(result).toBe('ok');
  });

  it('uses default options when none provided', async () => {
    const fn = jest.fn().mockResolvedValue('default');
    const result = await withRetry(fn);
    expect(result).toBe('default');
  });

  it('retries with exponential backoff', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('1'))
      .mockRejectedValueOnce(new Error('2'))
      .mockRejectedValueOnce(new Error('3'))
      .mockResolvedValue('ok');

    const onRetry = jest.fn();

    const result = await withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 1,
      backoffMultiplier: 2,
      onRetry,
    });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(4);
    expect(onRetry).toHaveBeenCalledTimes(3);
  });
});

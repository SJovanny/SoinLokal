export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

function jitter(delayMs: number): number {
  return delayMs + Math.random() * delayMs * 0.3;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    onRetry,
  } = options ?? {};

  let lastError: Error = new Error('withRetry: unknown error');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt === maxRetries) {
        break;
      }

      onRetry?.(attempt + 1, lastError);

      const rawDelay = baseDelayMs * Math.pow(backoffMultiplier, attempt);
      const delayMs = Math.min(jitter(rawDelay), maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

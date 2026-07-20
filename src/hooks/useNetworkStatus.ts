import { useState, useCallback, useRef } from 'react';

interface NetworkStatus {
  isConnected: boolean;
  checkConnection: () => Promise<boolean>;
}

const CONNECTIVITY_CHECK_URL = 'https://clients3.google.com/generate_204';
const CONNECTIVITY_TIMEOUT_MS = 5000;

export default function useNetworkStatus(): NetworkStatus {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const abortRef = useRef<AbortController | null>(null);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const timeout = setTimeout(() => controller.abort(), CONNECTIVITY_TIMEOUT_MS);
      const response = await fetch(CONNECTIVITY_CHECK_URL, {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const connected = response.ok;
      setIsConnected(connected);
      return connected;
    } catch {
      setIsConnected(false);
      return false;
    }
  }, []);

  return { isConnected, checkConnection };
}

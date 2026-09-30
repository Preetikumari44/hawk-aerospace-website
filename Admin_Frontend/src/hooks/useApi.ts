/** useApi — generic fetch hook w/ loading, error, refetch */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ApiError } from '../api/client';

interface UseApiState<T> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
  refetch: () => void;
}

/**
 * Hook for GET requests. Auto-fetches on mount.
 * @param fetcher - async fn returning data
 * @param deps - re-fetch when deps change
 */
export function useApi<T>(
  fetcher: () => Promise<{ data: T }>,
  deps: unknown[] = [],
): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mountedRef.current) setData(result.data);
    } catch (err) {
      if (mountedRef.current) setError(err as ApiError);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    execute();
    return () => { mountedRef.current = false; };
  }, [execute]);

  return { data, error, isLoading, refetch: execute };
}

/**
 * Hook for mutations (POST/PATCH/DELETE). Manual trigger.
 */
export function useMutation<T, A extends unknown[]>(
  mutator: (...args: A) => Promise<{ data: T }>,
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async (...args: A) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await mutator(...args);
      setData(result.data);
      return result.data;
    } catch (err) {
      setError(err as ApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [mutator]);

  return { data, error, isLoading, execute };
}

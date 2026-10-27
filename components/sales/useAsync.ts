'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Settled<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; error: Error; data?: undefined };

export type AsyncQuery<T> = Settled<T> & { reload: () => void };

/**
 * Runs a service call and exposes loading / success / error plus reload (for Retry).
 * "Empty" is decided by the view (see AsyncView) because only it knows what empty means.
 * `loader` must be a stable reference — pass a module-level service function.
 */
export function useAsync<T>(loader: () => Promise<T>): AsyncQuery<T> {
  const [state, setState] = useState<Settled<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loader().then(
      (data) => {
        if (!cancelled) setState({ status: 'success', data });
      },
      (err: unknown) => {
        if (!cancelled) setState({ status: 'error', error: err instanceof Error ? err : new Error(String(err)) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [loader, attempt]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return useMemo(() => ({ ...state, reload }) as AsyncQuery<T>, [state, reload]);
}

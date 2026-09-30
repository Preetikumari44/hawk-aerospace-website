import { useCallback, useEffect, useRef, useState } from 'react';
import { AsyncState } from '../types';

/**
 * Standard loading/loaded/empty/error wrapper used by every data section
 * in the dashboard (per the spec's "every major data section must
 * support Loading / Loaded / Empty / Error").
 */
export function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[] = []): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: 'idle', data: null });
  const mounted = useRef(true);

  const load = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'loading' }));
    fetcher()
      .then((data) => {
        if (mounted.current) setState({ status: 'loaded', data });
      })
      .catch((err: Error) => {
        if (mounted.current) setState({ status: 'error', data: null, error: err.message });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload: load };
}

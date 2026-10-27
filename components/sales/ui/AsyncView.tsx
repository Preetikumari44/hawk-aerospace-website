'use client';

import type { ReactNode } from 'react';
import type { AsyncQuery } from '@/components/sales/useAsync';
import { EmptyState, ErrorState, LoadingState } from './States';

interface AsyncViewProps<T> {
  query: AsyncQuery<T>;
  children: (data: T) => ReactNode;
  /** Return true when the loaded data should show the empty state. */
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyHint?: ReactNode;
  loadingLabel?: string;
  loadingLines?: number;
  errorTitle?: string;
}

/** One place that renders all four data states: loading, error (with retry), empty, success. */
export default function AsyncView<T>({
  query,
  children,
  isEmpty,
  emptyTitle = 'Nothing to show yet.',
  emptyHint,
  loadingLabel,
  loadingLines,
  errorTitle,
}: AsyncViewProps<T>) {
  if (query.status === 'loading') return <LoadingState label={loadingLabel} lines={loadingLines} />;
  if (query.status === 'error') return <ErrorState title={errorTitle} message={query.error.message} onRetry={query.reload} />;
  if (isEmpty?.(query.data)) return <EmptyState title={emptyTitle} hint={emptyHint} />;
  return <>{children(query.data)}</>;
}

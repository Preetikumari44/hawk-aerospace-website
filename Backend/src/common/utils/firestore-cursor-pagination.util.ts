import { BadRequestException } from '@nestjs/common';
import type { DocumentData, OrderByDirection, Query } from 'firebase-admin/firestore';

export interface CursorOrder {
  field: string;
  direction?: OrderByDirection;
}

export interface CursorPageMeta {
  limit: number;
  total?: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CursorPage<TDocument> {
  items: TDocument[];
  meta: CursorPageMeta;
}

interface CursorPayload {
  values: unknown[];
}

export async function paginateFirestoreQuery<TDocument extends DocumentData>(
  query: Query<TDocument>,
  options: {
    limit: number;
    cursor?: string;
    orderBy: CursorOrder[];
    getCursorValues: (document: TDocument) => unknown[];
    includeTotal?: boolean;
  },
): Promise<CursorPage<TDocument>> {
  if (options.orderBy.length === 0) {
    throw new BadRequestException('Cursor pagination requires at least one order field.');
  }

  let orderedQuery = options.orderBy.reduce(
    (nextQuery, order) => nextQuery.orderBy(order.field, order.direction ?? 'asc'),
    query,
  );
  const cursorValues = decodeCursor(options.cursor);

  if (cursorValues.length > 0) {
    if (cursorValues.length !== options.orderBy.length) {
      throw new BadRequestException('Invalid cursor shape for this query.');
    }
    orderedQuery = orderedQuery.startAfter(...cursorValues);
  }

  const [snapshot, countSnapshot] = await Promise.all([
    orderedQuery.limit(options.limit + 1).get(),
    options.includeTotal ? query.count().get() : Promise.resolve(null),
  ]);
  const pageDocs = snapshot.docs.slice(0, options.limit);
  const lastDoc = pageDocs[pageDocs.length - 1];
  const hasMore = snapshot.docs.length > options.limit;

  return {
    items: pageDocs.map((doc) => doc.data()),
    meta: {
      limit: options.limit,
      total: countSnapshot?.data().count,
      hasMore,
      nextCursor: hasMore && lastDoc ? encodeCursor(options.getCursorValues(lastDoc.data())) : null,
    },
  };
}

export async function forEachFirestoreQueryBatch<TDocument extends DocumentData>(
  query: Query<TDocument>,
  options: {
    batchSize: number;
    orderBy: CursorOrder[];
    getCursorValues: (document: TDocument) => unknown[];
    onBatch: (items: TDocument[]) => void | Promise<void>;
  },
): Promise<void> {
  if (options.orderBy.length === 0) {
    throw new BadRequestException('Batched query reads require at least one order field.');
  }

  let cursorValues: unknown[] = [];
  let batchCount = 0;

  for (;;) {
    let orderedQuery = options.orderBy.reduce(
      (nextQuery, order) => nextQuery.orderBy(order.field, order.direction ?? 'asc'),
      query,
    );

    if (cursorValues.length > 0) {
      orderedQuery = orderedQuery.startAfter(...cursorValues);
    }

    const snapshot = await orderedQuery.limit(options.batchSize).get();
    const items = snapshot.docs.map((doc) => doc.data());
    batchCount++;

    console.log(`[Firestore Batch ${batchCount}] Fetched ${items.length} items (batchSize: ${options.batchSize})`);

    if (items.length === 0) {
      console.log(`[Firestore Batch] Stopping: no items returned`);
      return;
    }

    await options.onBatch(items);

    if (items.length < options.batchSize) {
      console.log(`[Firestore Batch] Stopping: ${items.length} < ${options.batchSize}`);
      return;
    }

    cursorValues = options.getCursorValues(items[items.length - 1]);
    console.log(`[Firestore Batch] Continuing to next batch with cursor: ${JSON.stringify(cursorValues)}`);
  }
}

export async function collectFirestoreQueryInBatches<TDocument extends DocumentData>(
  query: Query<TDocument>,
  options: {
    batchSize?: number;
    orderBy: CursorOrder[];
    getCursorValues: (document: TDocument) => unknown[];
  },
): Promise<TDocument[]> {
  const items: TDocument[] = [];
  await forEachFirestoreQueryBatch(query, {
    batchSize: options.batchSize ?? 500,
    orderBy: options.orderBy,
    getCursorValues: options.getCursorValues,
    onBatch: (batch) => {
      items.push(...batch);
    },
  });
  return items;
}
export function getDocumentIdCursorValues<TDocument extends { id?: string }>(
  document: TDocument,
): unknown[] {
  return [document.id ?? null];
}

export function getTimestampIdCursorValues<TDocument extends Record<string, unknown>>(
  timestampField: keyof TDocument & string,
  idField: keyof TDocument & string,
): (document: TDocument) => unknown[] {
  return (document) => [document[timestampField] ?? null, document[idField] ?? null];
}

function encodeCursor(values: unknown[]): string {
  return Buffer.from(JSON.stringify({ values }), 'utf8').toString('base64url');
}

function decodeCursor(cursor?: string): unknown[] {
  if (!cursor) {
    return [];
  }

  try {
    const payload = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as CursorPayload;
    if (!Array.isArray(payload.values)) {
      throw new Error('Cursor values are missing.');
    }
    return payload.values;
  } catch {
    throw new BadRequestException('Invalid pagination cursor.');
  }
}

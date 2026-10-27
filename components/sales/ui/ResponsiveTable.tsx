import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Secondary text styling (muted). */
  muted?: boolean;
  /** Bold text styling. */
  strong?: boolean;
}

interface ResponsiveTableProps<T> {
  caption: string;
  rows: readonly T[];
  columns: readonly Column<T>[];
  getRowKey: (row: T) => string;
}

/**
 * md and up: a real <table> that scrolls inside its own container if it ever overflows.
 * Below md: each row becomes a card, so the page itself never scrolls sideways.
 */
export default function ResponsiveTable<T>({ caption, rows, columns, getRowKey }: ResponsiveTableProps<T>) {
  const cellTone = (c: Column<T>) => (c.muted ? 'text-muted-foreground' : 'text-foreground') + (c.strong ? ' font-bold' : '');

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[32rem] border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b">
              {columns.map((c) => (
                <th key={c.key} scope="col" className="pb-1 pr-3 text-xs font-bold text-muted-foreground">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getRowKey(row)} className="border-b">
                {columns.map((c) => (
                  <td key={c.key} className={`py-2 pr-3 align-middle text-sm ${cellTone(c)}`}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 md:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={getRowKey(row)} className="rounded-2xl border bg-card p-3">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
              {columns.map((c) => (
                <div key={c.key} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{c.header}</dt>
                  <dd className={`break-words text-sm ${cellTone(c)}`}>{c.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

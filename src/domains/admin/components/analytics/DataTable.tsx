import type { ReactNode } from 'react'

export interface DataTableColumn<T> {
  key: string
  header: string
  /** Render function for the cell. */
  render: (row: T) => ReactNode
  /** Mobile card primary line — main heading per row. Pass true on the column you want as headline. */
  mobilePrimary?: boolean
  /** Hide on mobile card view. */
  hideOnMobile?: boolean
  /** Cell alignment. */
  align?: 'start' | 'end' | 'center'
}

interface DataTableProps<T> {
  rows: T[]
  columns: DataTableColumn<T>[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  emptyText?: string
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  emptyText = 'אין נתונים להצגה',
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <p className="text-base text-on-surface-variant py-8 text-center">{emptyText}</p>
  }
  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-dark-border bg-surface-container">
        <table className="w-full text-base">
          <thead className="bg-surface-container-low border-b border-dark-border">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`py-3 px-4 text-sm font-medium text-on-surface-variant uppercase tracking-wide ${
                    c.align === 'center'
                      ? 'text-center'
                      : c.align === 'end'
                        ? 'text-left'
                        : 'text-right'
                  }`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-t border-dark-border ${
                  onRowClick ? 'cursor-pointer hover:bg-surface-container-low' : ''
                }`}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`py-3 px-4 text-on-surface ${
                      c.align === 'center'
                        ? 'text-center'
                        : c.align === 'end'
                          ? 'text-left'
                          : 'text-right'
                    }`}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <ul className="md:hidden space-y-2">
        {rows.map((row) => (
          <li key={rowKey(row)}>
            <button
              type="button"
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              disabled={!onRowClick}
              className="w-full text-right rounded-xl border border-dark-border bg-surface-container p-3 enabled:hover:bg-surface-container-low transition-colors min-h-[44px]"
            >
              {columns
                .filter((c) => c.mobilePrimary)
                .map((c) => (
                  <div key={c.key} className="font-semibold text-on-surface mb-1">
                    {c.render(row)}
                  </div>
                ))}
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                {columns
                  .filter((c) => !c.mobilePrimary && !c.hideOnMobile)
                  .map((c) => (
                    <div key={c.key} className="flex justify-between gap-2">
                      <dt className="text-on-surface-variant">{c.header}</dt>
                      <dd className="text-on-surface">{c.render(row)}</dd>
                    </div>
                  ))}
              </dl>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

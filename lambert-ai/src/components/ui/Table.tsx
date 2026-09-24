import { cn } from '@/lib/cn'

export interface TableColumn<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  hideOnMobile?: boolean
}

interface TableProps<T> {
  columns: TableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  className?: string
}

export function Table<T>({ columns, rows, rowKey, className }: TableProps<T>) {
  return (
    <div className={cn('w-full', className)}>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto rounded-lg border border-ink-300/30 sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper-100 text-ink-500">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="whitespace-nowrap px-4 py-3 font-medium">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-300/20">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="bg-paper-0 hover:bg-paper-50">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-ink-900">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="flex flex-col gap-3 sm:hidden">
        {rows.map((row) => (
          <div key={rowKey(row)} className="rounded-lg border border-ink-300/30 bg-paper-0 p-4">
            {columns
              .filter((c) => !c.hideOnMobile)
              .map((col) => (
                <div key={col.key} className="flex items-center justify-between gap-3 py-1 text-sm">
                  <span className="text-ink-500">{col.header}</span>
                  <span className="text-ink-900">{col.render(row)}</span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}

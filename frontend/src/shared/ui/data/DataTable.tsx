import { Table } from '@mantine/core'
import type { KeyboardEvent, ReactNode } from 'react'
import classes from './data.module.css'

export interface DataTableColumn<Row> {
  key: string
  header: string
  render: (row: Row) => ReactNode
  /** Right-aligns (inline end) and uses tabular digits. */
  numeric?: boolean
}

export interface DataTableProps<Row> {
  /** Accessible name of the table. */
  label: string
  columns: DataTableColumn<Row>[]
  rows: Row[]
  rowKey: (row: Row) => string
  /** Shown instead of the table when there are no rows (use EmptyState). */
  emptyState: ReactNode
  /** Makes rows clickable and keyboard-activatable (Enter/Space). */
  onRowClick?: (row: Row) => void
  /** Filters and actions above the table (use Toolbar). */
  toolbar?: ReactNode
  /** Width below which the table scrolls horizontally instead of squashing. */
  minWidth?: number
}

/** Admin data table. Keeps its filters (toolbar) next to it. */
export function DataTable<Row>({
  label,
  columns,
  rows,
  rowKey,
  emptyState,
  onRowClick,
  toolbar,
  minWidth = 560,
}: DataTableProps<Row>) {
  const onKeyDown = (row: Row) => (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onRowClick?.(row)
    }
  }

  return (
    <div className={classes.table}>
      {toolbar}
      {rows.length === 0 ? (
        emptyState
      ) : (
        <Table.ScrollContainer minWidth={minWidth} type="native">
          <Table aria-label={label} verticalSpacing="sm" horizontalSpacing="md" withRowBorders>
            <Table.Thead>
              <Table.Tr>
                {columns.map((column) => (
                  <Table.Th key={column.key} className={classes.th} data-numeric={column.numeric || undefined}>
                    {column.header}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((row) => (
                <Table.Tr
                  key={rowKey(row)}
                  className={classes.tr}
                  data-clickable={onRowClick ? true : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={onRowClick ? onKeyDown(row) : undefined}
                >
                  {columns.map((column) => (
                    <Table.Td key={column.key} className={classes.td} data-numeric={column.numeric || undefined}>
                      {column.render(row)}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </div>
  )
}

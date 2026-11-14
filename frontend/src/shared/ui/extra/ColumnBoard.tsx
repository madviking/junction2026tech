import { useEffect, useRef, type ReactNode } from 'react'
import { Text } from '@/shared/ui/typography/Text'
import classes from './ColumnBoard.module.css'

export interface ColumnBoardItem {
  /** DOM id of the item (unique on the page); used to scroll to and highlight it. */
  id: string
  content: ReactNode
}

export interface ColumnBoardColumn {
  key: string
  title: ReactNode
  items: ColumnBoardItem[]
}

export interface ColumnBoardProps {
  /** Accessible name of the scrollable board. */
  label: string
  columns: ColumnBoardColumn[]
  /** Item to scroll into view, focus and outline; changes re-trigger the scroll. */
  highlightedId?: string | null
}

/** Columns of cards side by side, scrolling horizontally (admin; e.g. a graph laid out by distance). */
export function ColumnBoard({ label, columns, highlightedId }: ColumnBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!highlightedId || !boardRef.current) return
    const target = boardRef.current.querySelector<HTMLElement>(`[data-board-item="${CSS.escape(highlightedId)}"]`)
    if (!target) return
    target.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    target.focus({ preventScroll: true })
  }, [highlightedId])

  return (
    <div ref={boardRef} className={classes.board} role="region" aria-label={label} tabIndex={0}>
      {columns.map((column) => (
        <section key={column.key} className={classes.column} aria-label={typeof column.title === 'string' ? column.title : undefined}>
          <Text variant="label" tone="muted" as="h3">
            {column.title}
          </Text>
          {column.items.map((item) => (
            <div
              key={item.id}
              id={item.id}
              data-board-item={item.id}
              className={classes.item}
              data-highlighted={highlightedId === item.id || undefined}
              tabIndex={-1}
            >
              {item.content}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

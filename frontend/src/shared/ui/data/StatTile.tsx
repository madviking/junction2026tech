import type { ReactNode } from 'react'
import { Text } from '@/shared/ui/typography/Text'
import classes from './data.module.css'

export interface StatTileProps {
  label: ReactNode
  value: ReactNode
  /** Change versus a previous period, for example "+12% vs last year". */
  delta?: ReactNode
  /** Whether the change is good, bad or neither (colour plus the delta text itself). */
  deltaTone?: 'success' | 'danger' | 'neutral'
  note?: ReactNode
}

/** One number with its label. Put several in a Grid. */
export function StatTile({ label, value, delta, deltaTone = 'neutral', note }: StatTileProps) {
  return (
    <div className={classes.stat}>
      <Text variant="caption" tone="muted" as="p">
        {label}
      </Text>
      <Text variant="title" as="p">
        {value}
      </Text>
      {delta && (
        <Text variant="caption" as="p" tone={deltaTone === 'neutral' ? 'muted' : deltaTone}>
          {delta}
        </Text>
      )}
      {note && (
        <Text variant="caption" tone="muted" as="p">
          {note}
        </Text>
      )}
    </div>
  )
}

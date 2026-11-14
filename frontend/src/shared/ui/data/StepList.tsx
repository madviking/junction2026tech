import { IconCheck } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { VisuallyHidden } from '@/shared/ui/layout/Layout'
import { Text } from '@/shared/ui/typography/Text'
import classes from './data.module.css'

export type StepStatus = 'done' | 'current' | 'upcoming'

export interface StepItem {
  id: string
  title: ReactNode
  detail?: ReactNode
  status: StepStatus
}

export interface StepListProps {
  steps: StepItem[]
  /** Screen-reader words for each status (localise these). */
  statusLabels?: Record<StepStatus, string>
}

const DEFAULT_STATUS_LABELS: Record<StepStatus, string> = { done: 'Done', current: 'Current step', upcoming: 'Upcoming' }

/** Ordered steps (for example "what happens next") with done/current/upcoming markers. */
export function StepList({ steps, statusLabels = DEFAULT_STATUS_LABELS }: StepListProps) {
  return (
    <ol className={classes.steps}>
      {steps.map((step, index) => (
        <li
          key={step.id}
          className={classes.step}
          data-status={step.status}
          aria-current={step.status === 'current' ? 'step' : undefined}
        >
          <span className={classes.marker} aria-hidden="true">
            {step.status === 'done' ? <IconCheck size={18} stroke={3} /> : index + 1}
          </span>
          <div className={classes.stepBody}>
            <Text as="span" variant="label" tone={step.status === 'upcoming' ? 'muted' : 'default'}>
              {step.title}
              <VisuallyHidden>{` (${statusLabels[step.status]})`}</VisuallyHidden>
            </Text>
            {step.detail && <Text tone="muted">{step.detail}</Text>}
          </div>
        </li>
      ))}
    </ol>
  )
}

import { Loader } from '@mantine/core'
import {
  IconAlertOctagonFilled,
  IconAlertTriangle,
  IconCircleCheck,
  IconInbox,
  IconInfoCircle,
  IconLanguage,
} from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { ActionButton } from '@/shared/ui/actions/ActionButton'
import type { Tone } from '@/shared/ui/tokens'
import { Text } from '@/shared/ui/typography/Text'
import classes from './feedback.module.css'

export type BannerTone = 'info' | 'warning' | 'emergency' | 'success'

const BANNER_ICON = {
  info: <IconInfoCircle size={24} aria-hidden="true" />,
  warning: <IconAlertTriangle size={24} aria-hidden="true" />,
  emergency: <IconAlertOctagonFilled size={24} aria-hidden="true" />,
  success: <IconCircleCheck size={24} aria-hidden="true" />,
}

export interface BannerProps {
  tone: BannerTone
  title: ReactNode
  children?: ReactNode
  /** One action under the text, for example an ActionButton or EmergencyCallLink. */
  action?: ReactNode
}

/** Highlighted message. `emergency` is solid red and announced immediately (role="alert"). */
export function Banner({ tone, title, children, action }: BannerProps) {
  return (
    <div className={classes.banner} data-tone={tone} role={tone === 'emergency' ? 'alert' : undefined}>
      <span className={classes.bannerIcon}>{BANNER_ICON[tone]}</span>
      <div className={classes.bannerBody}>
        <Text as="p" variant="label" tone="inherit">
          {title}
        </Text>
        {children && (
          <Text as="div" tone="inherit">
            {children}
          </Text>
        )}
        {action && <div className={classes.bannerAction}>{action}</div>}
      </div>
    </div>
  )
}

export interface StatusBadgeProps {
  tone: Tone
  children: ReactNode
}

/** Small status pill with a coloured dot (colour is never the only cue: the text says it). */
export function StatusBadge({ tone, children }: StatusBadgeProps) {
  return (
    <span className={classes.badge} data-tone={tone}>
      {children}
    </span>
  )
}

export interface PlaceholderNoticeProps {
  /** For example "Unchecked translation". */
  children: ReactNode
}

/** Marks content that is a draft or machine translation not yet checked by a person. */
export function PlaceholderNotice({ children }: PlaceholderNoticeProps) {
  return (
    <span className={classes.placeholder}>
      <IconLanguage size={16} aria-hidden="true" />
      {children}
    </span>
  )
}

export interface LoadingStateProps {
  /** Visible and announced, for example "Loading languages". */
  label: string
}

export function LoadingState({ label }: LoadingStateProps) {
  return (
    <div className={classes.loading} role="status">
      <Loader size="sm" color="primary" />
      <Text as="span" tone="muted">
        {label}
      </Text>
    </div>
  )
}

export interface EmptyStateProps {
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  /** One way forward, for example an ActionButton. */
  action?: ReactNode
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className={classes.state}>
      <span className={classes.stateIcon} aria-hidden="true">
        {icon ?? <IconInbox size={28} />}
      </span>
      <Text variant="heading" as="p">
        {title}
      </Text>
      {description && <Text tone="muted">{description}</Text>}
      {action}
    </div>
  )
}

export interface ErrorStateProps {
  /** What failed, for example "Could not load clinics". */
  title: ReactNode
  /** Why, and what to do. */
  message?: ReactNode
  onRetry?: () => void
  retryLabel?: string
  /** Shows the retry button as loading while a retry is running. */
  retrying?: boolean
}

/** Failed async view. Says what failed and offers a retry. */
export function ErrorState({ title, message, onRetry, retryLabel = 'Retry', retrying }: ErrorStateProps) {
  return (
    <div className={classes.error} role="alert">
      <Text as="p" variant="label" tone="danger">
        {title}
      </Text>
      {message && <Text>{message}</Text>}
      {onRetry && (
        <ActionButton variant="secondary" onPress={onRetry} loading={retrying}>
          {retryLabel}
        </ActionButton>
      )}
    </div>
  )
}

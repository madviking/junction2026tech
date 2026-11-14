import { ActionIcon, Tooltip } from '@mantine/core'
import type { ReactNode } from 'react'
import classes from './actions.module.css'

export interface IconButtonProps {
  /** Accessible name, also shown as a tooltip on hover and focus. Required: the button has no visible text. */
  label: string
  /** The icon (Tabler, size 18). */
  icon: ReactNode
  /** `subtle` (default) for edit actions, `danger` for destructive ones. */
  variant?: 'subtle' | 'danger'
  disabled?: boolean
  onPress?: () => void
}

/** Square 40px icon-only button for dense admin rows (edit, remove). Admin only; resident screens use ActionButton. */
export function IconButton({ label, icon, variant = 'subtle', disabled, onPress }: IconButtonProps) {
  return (
    <Tooltip label={label} openDelay={300} withinPortal>
      <ActionIcon
        variant="subtle"
        color={variant === 'danger' ? 'emergency' : 'primary'}
        radius="md"
        className={classes.iconButton}
        aria-label={label}
        disabled={disabled}
        onClick={onPress}
      >
        {icon}
      </ActionIcon>
    </Tooltip>
  )
}

import { Button } from '@mantine/core'
import type { ReactNode } from 'react'
import classes from './actions.module.css'

export type ActionButtonVariant = 'primary' | 'secondary' | 'danger' | 'subtle'

export interface ActionButtonProps {
  variant?: ActionButtonVariant
  /** Stretch to the container width (resident bottom actions). */
  fullWidth?: boolean
  /** Shows a spinner and blocks presses. */
  loading?: boolean
  disabled?: boolean
  /** Leading icon; mirrors with the writing direction automatically. */
  icon?: ReactNode
  /** 40px tall instead of 48px. Admin toolbars only; resident screens keep the default. */
  compact?: boolean
  type?: 'button' | 'submit'
  /** Renders a link (`tel:`, external URL) instead of a button. */
  href?: string
  /** With `href`: open in a new tab, and keep the click from reaching a clickable parent (a table row). */
  external?: boolean
  /** Accessible name when the visible label is not enough. */
  ariaLabel?: string
  onPress?: () => void
  children: ReactNode
}

const MANTINE_VARIANT = { primary: 'filled', secondary: 'outline', danger: 'filled', subtle: 'subtle' } as const
const MANTINE_COLOR = { primary: 'primary', secondary: 'primary', danger: 'emergency', subtle: 'primary' } as const
const BUTTON_CLASSES = { root: classes.buttonRoot, label: classes.buttonLabel }

/** The one button. Pick a `variant`; never style a button in a feature. */
export function ActionButton({
  variant = 'primary',
  fullWidth,
  loading,
  disabled,
  icon,
  compact,
  type = 'button',
  href,
  external,
  ariaLabel,
  onPress,
  children,
}: ActionButtonProps) {
  const shared = {
    variant: MANTINE_VARIANT[variant],
    color: MANTINE_COLOR[variant],
    fullWidth,
    loading,
    disabled,
    leftSection: icon,
    radius: 'md',
    classNames: BUTTON_CLASSES,
    'data-kind': variant,
    'data-compact': compact || undefined,
    'aria-label': ariaLabel,
    onClick: onPress,
  } as const

  if (href && external) {
    const stop = (event: { stopPropagation: () => void }) => event.stopPropagation()
    return (
      <Button
        component="a"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...shared}
        onClick={(event: { stopPropagation: () => void }) => {
          stop(event)
          onPress?.()
        }}
        onKeyDown={stop}
      >
        {children}
      </Button>
    )
  }
  if (href) {
    return (
      <Button component="a" href={href} {...shared}>
        {children}
      </Button>
    )
  }
  return (
    <Button type={type} {...shared}>
      {children}
    </Button>
  )
}

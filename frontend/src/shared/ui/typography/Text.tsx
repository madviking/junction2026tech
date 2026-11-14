import { createElement, type ReactNode } from 'react'
import { typeScale, type TextVariant } from '@/shared/ui/tokens'
import classes from './Text.module.css'

export type TextTone = 'default' | 'muted' | 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'emergency' | 'inherit'

export type TextElement = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div' | 'strong' | 'legend'

export interface TextProps {
  /** One of the six type styles. Each has a sensible default element. */
  variant?: TextVariant
  /** Colour role; every tone meets 4.5:1 on surface and background. */
  tone?: TextTone
  /** Override the rendered element (for example a `title` that must be an `h1`). */
  as?: TextElement
  /** Small uppercase label above a heading. */
  eyebrow?: boolean
  id?: string
  children: ReactNode
}

/** All text in the app. No free font sizes: pick a `variant`. */
export function Text({ variant = 'body', tone = 'default', as, eyebrow, id, children }: TextProps) {
  return createElement(
    as ?? typeScale[variant].element,
    {
      id,
      className: classes.root,
      'data-variant': variant,
      'data-tone': tone,
      'data-eyebrow': eyebrow || undefined,
    },
    children,
  )
}

import type { ReactNode } from 'react'
import type { SpaceToken, Tone } from '@/shared/ui/tokens'
import { Text, type TextTone } from '@/shared/ui/typography/Text'
import classes from './layout.module.css'

export type Align = 'start' | 'center' | 'end' | 'stretch' | 'baseline'
export type Justify = 'start' | 'center' | 'end' | 'between'

export interface StackProps {
  gap?: SpaceToken
  align?: Align
  justify?: Justify
  as?: 'div' | 'ul' | 'ol' | 'section' | 'form'
  children: ReactNode
}

/** Vertical flow with a token gap. */
export function Stack({ gap = 'md', align = 'stretch', justify, as: As = 'div', children }: StackProps) {
  return (
    <As className={classes.stack} data-gap={gap} data-align={align} data-justify={justify}>
      {children}
    </As>
  )
}

export interface RowProps {
  gap?: SpaceToken
  align?: Align
  justify?: Justify
  /** Wrap onto new lines when space runs out (default true: narrow screens). */
  wrap?: boolean
  /** Children share the row equally. */
  grow?: boolean
  /** The first child takes the free space (a field with a button after it). */
  growFirst?: boolean
  children: ReactNode
}

/** Horizontal flow with a token gap. Follows the writing direction. */
export function Row({ gap = 'sm', align = 'center', justify = 'start', wrap = true, grow, growFirst, children }: RowProps) {
  return (
    <div
      className={grow ? `${classes.row} ${classes.grow}` : growFirst ? `${classes.row} ${classes.growFirst}` : classes.row}
      data-gap={gap}
      data-align={align}
      data-justify={justify}
      data-wrap={wrap || undefined}
    >
      {children}
    </div>
  )
}

export interface GridProps {
  /** Minimum tile width before the grid adds a column. */
  min?: 'xs' | 'sm' | 'md' | 'lg'
  gap?: SpaceToken
  children: ReactNode
}

/** Responsive tile grid (auto-fill columns). For StatTiles, cards, swatches. */
export function Grid({ min = 'md', gap = 'md', children }: GridProps) {
  return (
    <div className={classes.grid} data-min={min} data-gap={gap}>
      {children}
    </div>
  )
}

export interface ContainerProps {
  /** `narrow` (40rem) for resident reading width, `wide` (75rem) for admin and galleries. */
  width?: 'narrow' | 'wide'
  children: ReactNode
}

/** Centered page column with side padding. */
export function Container({ width = 'narrow', children }: ContainerProps) {
  return (
    <div className={classes.container} data-width={width}>
      {children}
    </div>
  )
}

export interface SurfaceCardProps {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  tone?: 'default' | 'muted'
  as?: 'div' | 'section' | 'article' | 'li'
  children: ReactNode
}

/** White card on the page background. Avoid nesting cards. */
export function SurfaceCard({ padding = 'md', tone = 'default', as: As = 'div', children }: SurfaceCardProps) {
  return (
    <As className={classes.card} data-padding={padding} data-tone={tone}>
      {children}
    </As>
  )
}

export interface SectionProps {
  /** Small uppercase label above the title. */
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  /** Heading level of the title (default 2; 1 for the page title when there is no PageShell). */
  level?: 1 | 2 | 3
  /** Something aligned with the title, for example a StatusBadge or an action. */
  aside?: ReactNode
  children?: ReactNode
}

/** Titled block: eyebrow, title, optional description, then content. */
export function Section({ eyebrow, title, description, level = 2, aside, children }: SectionProps) {
  return (
    <section className={classes.section}>
      <div className={classes.sectionHeader}>
        {eyebrow && (
          <Text variant="caption" tone="muted" eyebrow>
            {eyebrow}
          </Text>
        )}
        <Row justify="between" gap="sm">
          <Text variant={level === 3 ? 'heading' : 'title'} as={`h${level}`}>
            {title}
          </Text>
          {aside}
        </Row>
        {description && <Text tone="muted">{description}</Text>}
      </div>
      {children}
    </section>
  )
}

export interface IconTextProps {
  icon: ReactNode
  tone?: TextTone | Tone
  variant?: 'body' | 'label' | 'caption'
  children: ReactNode
}

/** An icon followed by text, aligned and spaced by tokens. */
export function IconText({ icon, tone = 'default', variant = 'body', children }: IconTextProps) {
  return (
    <span className={classes.iconText}>
      {icon}
      <Text as="span" variant={variant} tone={tone === 'neutral' ? 'default' : tone}>
        {children}
      </Text>
    </span>
  )
}

export interface DividerProps {
  /** Optional text in the middle of the line. */
  label?: ReactNode
}

export function Divider({ label }: DividerProps) {
  if (!label) return <hr className={classes.divider} />
  return (
    <div className={classes.labelledDivider} role="separator">
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </div>
  )
}

/** Text only screen readers announce. */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className={classes.visuallyHidden}>{children}</span>
}

export interface DirectionScopeProps {
  dir: 'ltr' | 'rtl'
  lang: string
  children: ReactNode
}

/** A subtree in another language/direction (for example an Arabic quote on an English page). */
export function DirectionScope({ dir, lang, children }: DirectionScopeProps) {
  return (
    <div dir={dir} lang={lang} className={classes.directionScope}>
      {children}
    </div>
  )
}

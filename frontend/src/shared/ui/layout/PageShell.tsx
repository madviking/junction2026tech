import { IconArrowLeft, IconChevronRight } from '@tabler/icons-react'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Text } from '@/shared/ui/typography/Text'
import classes from './shells.module.css'

export interface PageShellBack {
  /** Accessible name, for example "Back". */
  label: string
  onPress: () => void
}

export interface PageShellProps {
  /** Page title (rendered as the page's h1). */
  title: ReactNode
  /** Small line under the title, for example the visit code. */
  subtitle?: ReactNode
  /** Shows a back arrow at the inline start. */
  back?: PageShellBack
  /** Inline-end header slot, for example the language button. */
  headerAction?: ReactNode
  /** Always visible at the inline end of the header row: a compact EmergencyCallLink. */
  emergency?: ReactNode
  /** Thin strip under the header row: a `PageProgress`. */
  progress?: ReactNode
  /** Sticky bottom area for the main action(s) of the screen. Deeper components add theirs with `PageActions`. */
  bottomActions?: ReactNode
  children: ReactNode
}

/** `undefined`: no PageShell above. `null`: the shell is mounting. Element: the sticky bottom bar. */
const ActionsSlotContext = createContext<HTMLElement | null | undefined>(undefined)

/**
 * Puts its children in the sticky bottom bar of the PageShell above, so the action that
 * moves the person on never scrolls away. Outside a PageShell it renders in place.
 */
export function PageActions({ children }: { children: ReactNode }) {
  const slot = useContext(ActionsSlotContext)
  if (slot === undefined) return <>{children}</>
  return slot ? createPortal(children, slot) : null
}

export interface PageProgressProps {
  /** 1-based current step. */
  value: number
  total: number
  /** Visible text at the end, for example "Your path". */
  label: string
  /** Read after the label by screen readers, for example "Step 3 of 6". */
  status: string
  onPress: () => void
  /** A back arrow before the strip: one step back. */
  back?: PageShellBack
}

/** Header progress strip: one segment per step, filled up to the current one; the whole strip is a button. */
export function PageProgress({ value, total, label, status, onPress, back }: PageProgressProps) {
  return (
    <div className={classes.progressRow}>
      {back && (
        <button type="button" className={classes.progressBack} aria-label={back.label} onClick={back.onPress}>
          <IconArrowLeft size={22} className={classes.mirror} aria-hidden="true" />
        </button>
      )}
      <button type="button" className={classes.progressButton} aria-label={`${label}. ${status}`} onClick={onPress}>
        <span className={classes.progressTrack} aria-hidden="true">
          {Array.from({ length: total }, (_, index) => (
            <span key={index} className={classes.progressSegment} data-done={index < value || undefined} />
          ))}
        </span>
        <span className={classes.progressLabel}>
          {label}
          <IconChevronRight size={18} className={classes.mirror} aria-hidden="true" />
        </span>
      </button>
    </div>
  )
}

/** Resident page frame: one mobile-first column with a slim sticky header and sticky bottom actions. */
export function PageShell({ title, subtitle, back, headerAction, emergency, progress, bottomActions, children }: PageShellProps) {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  return (
    <ActionsSlotContext.Provider value={slot}>
      <div className={classes.page}>
        <header className={classes.pageHeader}>
          <div className={classes.pageHeaderRow}>
            {back && (
              <button type="button" className={classes.iconButton} aria-label={back.label} onClick={back.onPress}>
                <IconArrowLeft size={24} className={classes.mirror} aria-hidden="true" />
              </button>
            )}
            <div className={classes.pageTitle}>
              <Text variant="heading" as="h1">
                {title}
              </Text>
              {subtitle && (
                <Text variant="caption" tone="muted">
                  {subtitle}
                </Text>
              )}
            </div>
            {headerAction}
            {emergency}
          </div>
          {progress && <div className={classes.pageProgress}>{progress}</div>}
        </header>
        <main className={classes.pageMain}>{children}</main>
        {/* Empty until `bottomActions` or a PageActions fills it; hidden while empty (CSS). */}
        <div className={classes.pageActions} ref={setSlot}>
          {bottomActions}
        </div>
      </div>
    </ActionsSlotContext.Provider>
  )
}

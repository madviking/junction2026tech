import { IconArrowLeft } from '@tabler/icons-react'
import type { ReactNode } from 'react'
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
  /** Shows a back arrow at the inline start. */
  back?: PageShellBack
  /** Inline-end header slot, for example the language button. */
  headerAction?: ReactNode
  /** Always visible under the header row, for example an EmergencyCallLink. */
  emergency?: ReactNode
  /** Sticky bottom area for the main action(s) of the screen. */
  bottomActions?: ReactNode
  children: ReactNode
}

/** Resident page frame: one mobile-first column with sticky header, emergency slot and bottom actions. */
export function PageShell({ title, back, headerAction, emergency, bottomActions, children }: PageShellProps) {
  return (
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
          </div>
          {headerAction}
        </div>
        {emergency && <div className={classes.pageEmergency}>{emergency}</div>}
      </header>
      <main className={classes.pageMain}>{children}</main>
      {bottomActions && (
        <div className={classes.pageActions}>
          <div className={classes.pageActionsInner}>{bottomActions}</div>
        </div>
      )}
    </div>
  )
}

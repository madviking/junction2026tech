import { FocusTrap, Portal, RemoveScroll } from '@mantine/core'
import { useEffect, type ReactNode } from 'react'
import classes from './overlays.module.css'

export interface FullScreenSheetProps {
  opened: boolean
  onClose: () => void
  /** Id of the heading inside `children` that names the dialog. */
  labelledBy: string
  children: ReactNode
  /** Actions pinned to the bottom (for example the call link and Cancel). */
  footer?: ReactNode
}

/**
 * Resident full-screen panel over the current page (urgent help). It is not a page: closing it
 * (Cancel, Escape) returns to exactly where the person was, and it adds nothing to the history.
 */
export function FullScreenSheet({ opened, onClose, labelledBy, children, footer }: FullScreenSheetProps) {
  useEffect(() => {
    if (!opened) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [opened, onClose])

  if (!opened) return null
  return (
    <Portal>
      <RemoveScroll>
        <FocusTrap active>
          <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} className={classes.sheet}>
            <div className={classes.sheetBody}>{children}</div>
            {footer && <div className={classes.sheetFooter}>{footer}</div>}
          </div>
        </FocusTrap>
      </RemoveScroll>
    </Portal>
  )
}

import { Drawer, useDirection } from '@mantine/core'
import { useMemo, type ReactNode } from 'react'
import classes from './overlays.module.css'

export interface SideDrawerProps {
  opened: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  /** Actions pinned under the content, for example Cancel / Save. */
  footer?: ReactNode
  /** Accessible name of the close button. */
  closeLabel?: string
}

const DRAWER_CLASSES = { content: classes.content, body: classes.body, title: classes.title }

/** Panel sliding in from the inline end (right in LTR, left in RTL) for editing one item. */
export function SideDrawer({ opened, onClose, title, children, footer, closeLabel = 'Close' }: SideDrawerProps) {
  const { dir } = useDirection()
  const closeButtonProps = useMemo(() => ({ 'aria-label': closeLabel }), [closeLabel])
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={title}
      position={dir === 'rtl' ? 'left' : 'right'}
      size="md"
      padding="lg"
      closeButtonProps={closeButtonProps}
      classNames={DRAWER_CLASSES}
    >
      <div className={classes.scroll}>{children}</div>
      {footer && <div className={classes.footer}>{footer}</div>}
    </Drawer>
  )
}

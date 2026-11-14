import type { ReactNode } from 'react'
import classes from './data.module.css'

export interface ToolbarProps {
  /** Filters and search, at the inline start. */
  children?: ReactNode
  /** Buttons at the inline end. */
  actions?: ReactNode
}

/** A wrapping row of filters (start) and actions (end), for above tables. */
export function Toolbar({ children, actions }: ToolbarProps) {
  return (
    <div className={classes.toolbar}>
      <div className={classes.toolbarGroup}>{children}</div>
      {actions && <div className={classes.toolbarGroup}>{actions}</div>}
    </div>
  )
}

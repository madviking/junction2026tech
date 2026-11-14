import type { ReactNode } from 'react'

/** One page. Resident `path` is absolute (`/clinics`); admin `path` is relative to `/admin` (`''` = admin home). */
export interface AppRoute {
  path: string
  element: ReactNode
}

/** An admin page, optionally listed in the AdminShell side navigation. */
export interface AdminRoute extends AppRoute {
  nav?: { label: string; icon?: ReactNode; end?: boolean }
}

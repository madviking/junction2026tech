import { AppShell, Burger, NavLink } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useMemo, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { Text } from '@/shared/ui/typography/Text'
import classes from './shells.module.css'

export interface AdminNavItem {
  label: string
  /** Router path, for example `/admin/phrases`. */
  to: string
  icon?: ReactNode
  /** Active only on an exact path match (use for the admin home). */
  end?: boolean
}

export interface AdminShellProps {
  /** Product or area name in the header. */
  brand: ReactNode
  navItems: AdminNavItem[]
  /** Accessible name of the navigation landmark. */
  navLabel?: string
  /** Header inline-end slot: signed-in user, sign-out. */
  user?: ReactNode
  /** Accessible name of the menu toggle shown below desktop width. */
  menuLabel?: string
  children: ReactNode
}

const NAVBAR = { width: 248, breakpoint: 'md' } as const
const HEADER = { height: 64 }
const NAV_CLASSES = { root: classes.adminNavLink, label: classes.adminNavLabel }

function isActive(pathname: string, item: AdminNavItem) {
  return item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)
}

/** Admin frame: side navigation on desktop, collapsing to a top menu below 62em (tablet). */
export function AdminShell({
  brand,
  navItems,
  navLabel = 'Admin',
  user,
  menuLabel = 'Toggle navigation',
  children,
}: AdminShellProps) {
  const [opened, { toggle, close }] = useDisclosure(false)
  const { pathname } = useLocation()
  const navbar = useMemo(() => ({ ...NAVBAR, collapsed: { mobile: !opened } }), [opened])

  return (
    <AppShell header={HEADER} navbar={navbar} padding="lg">
      <AppShell.Header>
        <div className={classes.adminHeader}>
          <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" aria-label={menuLabel} className={classes.burger} />
          <div className={classes.adminBrand}>
            <Text variant="heading" as="p">
              {brand}
            </Text>
          </div>
          {user}
        </div>
      </AppShell.Header>
      <AppShell.Navbar className={classes.adminNavbar} component="nav" aria-label={navLabel}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            component={Link}
            to={item.to}
            label={item.label}
            leftSection={item.icon}
            active={isActive(pathname, item)}
            aria-current={isActive(pathname, item) ? 'page' : undefined}
            classNames={NAV_CLASSES}
            onClick={close}
          />
        ))}
      </AppShell.Navbar>
      <AppShell.Main className={classes.adminMain}>{children}</AppShell.Main>
    </AppShell>
  )
}

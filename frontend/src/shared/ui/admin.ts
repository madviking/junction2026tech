/**
 * Admin-only primitives (desktop-first). Import from `@/shared/ui/admin` in admin
 * features and `src/app/admin`; resident code never imports this file, so these
 * components (and Mantine's AppShell, Table, Drawer, Tabs) stay out of the resident bundle.
 */
export { AdminShell, type AdminNavItem, type AdminShellProps } from '@/shared/ui/layout/AdminShell'
export { DataTable, type DataTableColumn, type DataTableProps } from '@/shared/ui/data/DataTable'
export { Tabs, type TabItem, type TabsProps } from '@/shared/ui/data/Tabs'
export { Toolbar, type ToolbarProps } from '@/shared/ui/data/Toolbar'
export { SideDrawer, type SideDrawerProps } from '@/shared/ui/overlays/SideDrawer'
export { IconButton, type IconButtonProps } from '@/shared/ui/actions/IconButton'

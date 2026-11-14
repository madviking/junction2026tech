import { Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { adminPublicRoutes, adminRoutes } from '@/app/adminRoutes'
import { AdminSessionMenu, RequireAdminSession } from '@/features/admin-auth'
import { EmptyState, LoadingState } from '@/shared/ui'
import { AdminShell, type AdminNavItem } from '@/shared/ui/admin'

const navItems: AdminNavItem[] = adminRoutes
  .filter((route) => route.nav)
  .map((route) => ({
    label: route.nav?.label ?? route.path,
    to: route.path ? `/admin/${route.path}` : '/admin',
    icon: route.nav?.icon,
    end: route.nav?.end,
  }))

const pageFallback = <LoadingState label="Loading page" />
const userMenu = <AdminSessionMenu />

/** Signed-in admin pages inside the AdminShell. */
function SignedInArea() {
  return (
    <AdminShell brand="Silta admin" navItems={navItems} navLabel="Admin sections" user={userMenu}>
      <Suspense fallback={pageFallback}>
        <Routes>
          {adminRoutes.map((route) =>
            route.path ? (
              <Route key={route.path} path={route.path} element={route.element} />
            ) : (
              <Route key="index" index element={route.element} />
            ),
          )}
          <Route path="*" element={<EmptyState title="Page not found" description="Pick a section from the menu." />} />
        </Routes>
      </Suspense>
    </AdminShell>
  )
}

/**
 * The admin area: lazy-loaded as one chunk from AppRoutes (`/admin/*`). Sign-in is public;
 * everything else needs a session (no session or any 401 → `/admin/sign-in?next=...`).
 */
export function AdminArea() {
  return (
    <Suspense fallback={pageFallback}>
      <Routes>
        {adminPublicRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
        <Route
          path="*"
          element={
            <RequireAdminSession signInPath="/admin/sign-in">
              <SignedInArea />
            </RequireAdminSession>
          }
        />
      </Routes>
    </Suspense>
  )
}

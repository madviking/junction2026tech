import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { NotFoundPage } from '@/app/resident/NotFoundPage'
import { residentRoutes } from '@/app/residentRoutes'
import { LoadingState } from '@/shared/ui'

// Separate chunks: the whole admin area, and the design-system gallery.
const AdminArea = lazy(() => import('@/app/admin/AdminArea').then((m) => ({ default: m.AdminArea })))
const DesignSystemPage = lazy(() =>
  import('@/features/design-system').then((m) => ({ default: m.DesignSystemPage })),
)

const pageFallback = <LoadingState label="Loading" />

export function AppRoutes() {
  return (
    <Suspense fallback={pageFallback}>
      <Routes>
        {residentRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
        <Route path="/admin/*" element={<AdminArea />} />
        <Route path="/design-system" element={<DesignSystemPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

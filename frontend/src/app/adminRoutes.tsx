import { IconChartBar, IconFileText, IconHistory, IconLayoutDashboard, IconRoute, IconVolume } from '@tabler/icons-react'
import { lazy } from 'react'
import { JOURNEY_EDITOR } from '@/app/features'
import type { AdminRoute, AppRoute } from '@/app/routeTypes'
// admin-auth is part of the lazy AdminArea chunk (guard, session menu), so its page is not split further.
import { SignInPage } from '@/features/admin-auth'

// Every admin page is lazy so it never ships in the resident chunk. Pattern for a feature:
// const PhrasesPage = lazy(() => import('@/features/admin-phrases').then((m) => ({ default: m.PhrasesPage })))
const AdminHome = lazy(() => import('@/app/admin/AdminHome').then((m) => ({ default: m.AdminHome })))
const ContentPage = lazy(() => import('@/features/admin-content').then((m) => ({ default: m.ContentPage })))
const VersionsPage = lazy(() => import('@/features/admin-content').then((m) => ({ default: m.VersionsPage })))
const AudioPage = lazy(() => import('@/features/admin-audio').then((m) => ({ default: m.AudioPage })))
const JourneyEditorPage = lazy(() => import('@/features/admin-journey').then((m) => ({ default: m.JourneyEditorPage })))
const UsagePage = lazy(() => import('@/features/admin-usage').then((m) => ({ default: m.UsagePage })))

/** Admin pages without a session, outside the AdminShell (relative to /admin). */
export const adminPublicRoutes: AppRoute[] = [{ path: 'sign-in', element: <SignInPage /> }]

/** Admin pages under /admin (relative paths), behind sign-in. Add a page with one line; `nav` lists it in the side navigation. */
export const adminRoutes: AdminRoute[] = [
  { path: '', element: <AdminHome />, nav: { label: 'Overview', icon: <IconLayoutDashboard size={20} />, end: true } },
  { path: 'content', element: <ContentPage />, nav: { label: 'Content', icon: <IconFileText size={20} /> } },
  { path: 'versions', element: <VersionsPage />, nav: { label: 'Versions', icon: <IconHistory size={20} /> } },
  ...(JOURNEY_EDITOR ? [{ path: 'journey', element: <JourneyEditorPage />, nav: { label: 'Journey', icon: <IconRoute size={20} /> } }] : []),
  { path: 'audio', element: <AudioPage />, nav: { label: 'Audio', icon: <IconVolume size={20} /> } },
  { path: 'usage', element: <UsagePage />, nav: { label: 'Usage and audit', icon: <IconChartBar size={20} /> } },
]

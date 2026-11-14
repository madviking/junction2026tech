import { lazy } from 'react'
import type { AppRoute } from '@/app/routeTypes'
import { WithLanguage } from '@/app/resident/WithLanguage'
import { ClinicianLookupPage, ClinicianPage } from '@/features/clinician'
import { HealthPage } from '@/features/health'
import { JourneyPage, JourneyStartPage } from '@/features/journey'
import { LanguagePage } from '@/features/language'
import { VisitCardPage } from '@/features/visit-card'

// Staff screen, lazy: it may use admin table primitives without growing the resident chunk.
const CountyPage = lazy(() => import('@/features/county').then((m) => ({ default: m.CountyPage })))

/**
 * Resident, clinician and county pages (main chunk, anonymous). Add a page with one line.
 * `WithLanguage` loads the published content for the page's language (the one i18n layer).
 * The clinician view is always Finnish.
 */
export const residentRoutes: AppRoute[] = [
  { path: '/', element: <WithLanguage lang="en"><LanguagePage /></WithLanguage> },
  { path: '/r/:lang', element: <WithLanguage><JourneyStartPage /></WithLanguage> },
  { path: '/r/:lang/v/:code', element: <WithLanguage><JourneyPage /></WithLanguage> },
  { path: '/r/:lang/v/:code/card', element: <WithLanguage><VisitCardPage /></WithLanguage> },
  { path: '/clinic', element: <WithLanguage lang="fi"><ClinicianLookupPage /></WithLanguage> },
  { path: '/clinic/:code', element: <WithLanguage lang="fi"><ClinicianPage /></WithLanguage> },
  { path: '/county/:id', element: <WithLanguage lang="en"><CountyPage /></WithLanguage> },
  { path: '/health', element: <HealthPage /> },
]

import { fireEvent, screen, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AboutPage } from '@/features/about/AboutPage'
import type { LiveBundle } from '@/shared/api/types'
import { ContentProvider } from '@/shared/i18n'
import { renderWithProviders } from '@/test/render'

const text = (value: string) => ({ text: value, lang: 'en' as const, review: 'checked' as const, fallback: false })
const bundle = {
  version: 1,
  lang: 'en',
  dir: 'ltr',
  placeholder: false,
  languages: [{ code: 'en', name: 'English', dir: 'ltr', placeholder: false, profile: 'C2' }],
  texts: {
    'ui.about.title': text('About Silta'),
    'ui.about.not.title': text('What Silta does not do'),
    'ui.about.not.text': text('Silta is not a doctor and does not diagnose.'),
    'ui.about.privacy.title': text('Your privacy'),
    'ui.journey.emergency_call': text('Emergency? Call'),
    'ui.journey.emergency.title': text('Call 112 now'),
    'ui.urgent.button': text('Urgent help'),
    'ui.urgent.cancel': text('Cancel'),
  },
  journey: { start: 'describe', interrupts: [], routeFact: { askAt: 'route', questions: 0, ifUnknownRoute: 'A1', ifUnknownReview: null }, stages: [] },
  cards: { symptoms: [], emergencySigns: [], clinicianStage: 'visit', clinician: [] },
  lanes: [],
  routes: [],
} satisfies LiveBundle

describe('AboutPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows what Silta is not, the privacy promise and urgent help with the 112 link', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(bundle)))
    renderWithProviders(
      <Routes>
        <Route
          path="/r/:lang/about"
          element={
            <ContentProvider lang="en">
              <AboutPage />
            </ContentProvider>
          }
        />
      </Routes>,
      { route: '/r/en/about' },
    )
    expect(await screen.findByRole('heading', { level: 1, name: 'About Silta' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'What Silta does not do' })).toBeInTheDocument()
    expect(screen.getByText('Silta is not a doctor and does not diagnose.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Your privacy' })).toBeInTheDocument()
    // The red header control opens urgent help; the call to 112 is inside it.
    fireEvent.click(screen.getByRole('button', { name: 'Urgent help' }))
    const sheet = await screen.findByRole('dialog', { name: 'Call 112 now' })
    expect(within(sheet).getByRole('link', { name: /Emergency\? Call\s*112/ })).toHaveAttribute('href', 'tel:112')
  })
})

import { fireEvent, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguagePage } from '@/features/language/LanguagePage'
import type { LiveBundle } from '@/shared/api/types'
import { ContentProvider } from '@/shared/i18n'
import { renderWithProviders } from '@/test/render'

const bundle = {
  version: 1,
  lang: 'en',
  dir: 'ltr',
  placeholder: false,
  languages: [
    { code: 'en', name: 'English', dir: 'ltr', placeholder: false, profile: 'C2' },
    { code: 'ar', name: 'العربية', dir: 'rtl', placeholder: true, profile: 'C2' },
  ],
  texts: { 'ui.language.unchecked': { text: 'Translation not yet checked', lang: 'en', review: 'checked', fallback: false } },
  journey: { start: 'describe', interrupts: [], routeFact: { askAt: 'route', questions: 0, ifUnknownRoute: 'A1', ifUnknownReview: null }, stages: [] },
  cards: { symptoms: [], emergencySigns: [], clinicianStage: 'visit', clinician: [] },
  lanes: [],
  routes: [],
} satisfies LiveBundle

describe('LanguagePage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lists the published languages, marks unchecked ones and opens the journey in the tapped one', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(bundle)))
    renderWithProviders(
      <Routes>
        <Route
          path="/"
          element={
            <ContentProvider lang="en">
              <LanguagePage />
            </ContentProvider>
          }
        />
        <Route path="/r/:lang" element={<p>journey start</p>} />
      </Routes>,
    )

    expect(await screen.findByRole('button', { name: 'English' })).not.toHaveAccessibleDescription()
    const arabic = screen.getByRole('button', { name: 'العربية' })
    expect(arabic).toHaveAccessibleDescription('Translation not yet checked')

    fireEvent.click(arabic)
    expect(await screen.findByText('journey start')).toBeInTheDocument()
  })
})

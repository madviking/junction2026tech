import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { liveBundle, stubNetwork } from '@/features/clinician/__fixtures__/network'
import { ClinicianPage } from '@/features/clinician/ClinicianPage'
import type { ClinicianSummary } from '@/features/clinician/types'
import { ContentProvider } from '@/shared/i18n'
import { renderWithProviders } from '@/test/render'

const CODE = 'SLT-GZDQ-CX7N'

const texts = {
  'ui.clinician.confirm': 'Lähetä seuraavat askeleet',
  'ui.clinician.sent': 'Seuraavat askeleet lähetetty potilaalle',
  'ui.clinician.interpreter_needed': 'Tulkki tarvitaan: {language}',
  'ui.clinician.lang.en': 'englanti',
}

function summary(selected: string[] = []): ClinicianSummary {
  const cards: [string, string][] = [
    ['referral_sent', 'Lähete lähetetty'],
    ['tests_ordered', 'Tutkimuksia tilattu'],
    ['nothing_more', 'Muita toimia ei tarvita'],
  ]
  return {
    code: CODE,
    language: { code: 'en', name: 'English' },
    interpreter: { needed: true, language: 'English' },
    situation: 'Hälyttävä oire',
    symptoms: ['Uusi kyhmy tai turvotus'],
    route: { name: 'Kuntalainen, julkinen terveydenhuolto', door: 'hyvinvointialueen terveysasema' },
    visitDate: '2026-11-20',
    history: [{ at: '2026-11-14T00:17:15.294Z', text: 'Mitä tapahtui, kun otit yhteyttä? → Kukaan ei vastannut' }],
    answerCards: cards.map(([outcome, text]) => ({ outcome, text, selected: selected.includes(outcome) })),
    flags: ['Kukaan ei vastannut (2×)'],
  }
}

describe('ClinicianPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows the Finnish summary and posts the selected answers', async () => {
    const posted: unknown[] = []
    stubNetwork((url, init) => {
      if (url.pathname === '/api/content/live') return Response.json(liveBundle('fi', texts))
      if (url.pathname === `/api/visits/${CODE}/summary`) return Response.json(summary())
      if (url.pathname === `/api/visits/${CODE}/clinician` && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as { answers: string[] }
        posted.push(body)
        return Response.json(summary(body.answers))
      }
      return undefined
    })
    const user = userEvent.setup()
    renderWithProviders(
      <ContentProvider lang="fi">
        <Routes>
          <Route path="/clinic/:code" element={<ClinicianPage />} />
        </Routes>
      </ContentProvider>,
      { route: `/clinic/${CODE}`, lang: 'fi' },
    )

    expect(await screen.findByText('Tulkki tarvitaan: englanti')).toBeInTheDocument()
    expect(screen.getByText('Hälyttävä oire')).toBeInTheDocument()
    expect(screen.getByText('Kukaan ei vastannut (2×)')).toBeInTheDocument()

    const confirm = screen.getByRole('button', { name: 'Lähetä seuraavat askeleet' })
    expect(confirm).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Tutkimuksia tilattu' }))
    await user.click(screen.getByRole('button', { name: 'Lähete lähetetty' }))
    expect(screen.getByRole('button', { name: 'Lähete lähetetty' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(confirm)

    expect(await screen.findByText('Seuraavat askeleet lähetetty potilaalle')).toBeInTheDocument()
    // Card order of the summary, not tap order.
    expect(posted).toEqual([{ answers: ['referral_sent', 'tests_ordered'] }])
    expect(screen.getByRole('button', { name: 'Lähete lähetetty' })).toBeDisabled()
  })
})

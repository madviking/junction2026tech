import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { liveBundle, stubNetwork } from '@/features/visit-card/__fixtures__/network'
import type { VisitView } from '@/features/visit-card/types'
import { VisitCardPage } from '@/features/visit-card/VisitCardPage'
import { ContentProvider } from '@/shared/i18n'
import { renderWithProviders } from '@/test/render'

const CODE = 'SLT-GZDQ-CX7N'

const texts = {
  'ui.visit.title': 'Your visit card',
  'ui.visit.next_title': 'Next steps',
  'ui.visit.next_empty': 'Your doctor or nurse adds the next steps here.',
  'ui.visit.interpreter_title': 'You have the right to an interpreter',
  'journey.stage.contact.ask': 'What happened when you contacted them?',
  'journey.outcome.contact.got_time.card': 'I got an appointment',
}

function visitView(nextSteps: VisitView['nextSteps'], interpreterNeeded = true): VisitView {
  return {
    code: CODE,
    lang: 'en',
    interpreterNeeded,
    county: 'helsinki',
    state: { stage: 'wait', lane: 'U2', route: 'A1', ladderStep: 0, visitDate: '2026-11-20', tries: [] },
    stage: { id: 'wait', outcomes: [], terminal: false, ladder: 0, checkIns: [], overdueNext: null },
    ask: null,
    outcomes: [],
    interrupts: [],
    then: null,
    ladder: null,
    symptoms: [{ id: 'lump', text: 'A new lump or swelling', selected: true }],
    durations: [],
    carePath: null,
    nextSteps,
    history: [{ stage: 'contact', outcome: 'got_time', at: '2026-11-14T00:00:00Z', actor: 'resident' }],
  }
}

function renderCard(view: VisitView) {
  stubNetwork((url) => {
    if (url.pathname === '/api/content/live') return Response.json(liveBundle('en', texts))
    if (url.pathname === `/api/visits/${CODE}`) return Response.json(view)
    return undefined
  })
  renderWithProviders(
    <ContentProvider lang="en">
      <Routes>
        <Route path="/r/:lang/v/:code/card" element={<VisitCardPage />} />
      </Routes>
    </ContentProvider>,
    { route: `/r/en/v/${CODE}/card` },
  )
}

describe('VisitCardPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows the code, the summary and the empty next-steps state', async () => {
    renderCard(visitView([]))

    expect(await screen.findByText('Your doctor or nurse adds the next steps here.')).toBeInTheDocument()
    expect(screen.getByText('GZDQ')).toBeInTheDocument()
    expect(screen.getByText('A new lump or swelling')).toBeInTheDocument()
    expect(screen.getByText('What happened when you contacted them? → I got an appointment')).toBeInTheDocument()
    expect(screen.getByText('You have the right to an interpreter')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /clinician/i })).toHaveAttribute('href', `/clinic/${CODE}`)
  })

  it('shows no interpreter notice when none is needed (Finnish, Swedish)', async () => {
    renderCard(visitView([], false))
    expect(await screen.findByText('GZDQ')).toBeInTheDocument()
    expect(screen.queryByText('You have the right to an interpreter')).not.toBeInTheDocument()
  })

  it('lists the next steps from the clinician', async () => {
    renderCard(
      visitView([
        { outcome: 'referral_sent', text: 'A referral was sent. You should hear within 3 weeks.' },
        { outcome: 'tests_ordered', text: 'Tests were ordered.' },
      ]),
    )

    const items = await screen.findAllByRole('listitem')
    expect(screen.getByText('A referral was sent. You should hear within 3 weeks.')).toBeInTheDocument()
    expect(screen.getByText('Tests were ordered.')).toBeInTheDocument()
    expect(items.length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText('Your doctor or nurse adds the next steps here.')).not.toBeInTheDocument()
  })
})

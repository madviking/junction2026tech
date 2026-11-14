import { screen, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { liveBundle, stubNetwork } from '@/features/county/__fixtures__/network'
import { CountyPage } from '@/features/county/CountyPage'
import type { CountyView } from '@/features/county/types'
import { ContentProvider } from '@/shared/i18n'
import { renderWithProviders } from '@/test/render'

const texts = {
  'ui.county.total': 'Journeys in total',
  'ui.county.by_stage': 'Where people are now, by language',
  'ui.county.by_outcome': 'What happened, by language',
  'ui.county.source': 'Source: {source}',
  'ui.county.lang.so': 'Somali',
  'ui.county.stage.wait': 'Waiting for the visit',
  'journey.outcome.visit.referral_sent.card': 'Referral sent',
}

const county: CountyView = {
  id: 'helsinki',
  name: 'City of Helsinki',
  figures: [
    { label: 'Breast cancer screening participation', value: 74.3, unit: '%', year: 2024, source: 'Sotkanet indicator 3621' },
    { label: 'National target', value: 80, unit: '%', year: null, source: 'National Cancer Strategy' },
  ],
  topLanguages: ['Russian', 'Somali'],
  counts: {
    total: 7,
    byStage: [{ lang: 'so', stage: 'wait', count: 3 }],
    byOutcome: [{ lang: 'so', stage: 'visit', outcome: 'referral_sent', count: 2 }],
  },
  generatedAt: '2026-11-14T00:17:22.706Z',
}

describe('CountyPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('renders the public figures and the anonymous counts', async () => {
    stubNetwork((url) => {
      if (url.pathname === '/api/content/live') return Response.json(liveBundle('en', texts))
      if (url.pathname === '/api/regions/counties/helsinki') return Response.json(county)
      return undefined
    })
    renderWithProviders(
      <ContentProvider lang="en">
        <Routes>
          <Route path="/county/:id" element={<CountyPage />} />
        </Routes>
      </ContentProvider>,
      { route: '/county/helsinki' },
    )

    expect(await screen.findByText('Breast cancer screening participation')).toBeInTheDocument()
    expect(screen.getByText('74.3 %')).toBeInTheDocument()
    expect(screen.getByText('Source: Sotkanet indicator 3621')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Russian', 'Somali'])
    expect(screen.getByText('7')).toBeInTheDocument()

    const stageTable = screen.getByRole('table', { name: 'Where people are now, by language' })
    expect(within(stageTable).getByText('Waiting for the visit')).toBeInTheDocument()
    expect(within(stageTable).getByText('3')).toBeInTheDocument()
    const outcomeTable = screen.getByRole('table', { name: 'What happened, by language' })
    expect(within(outcomeTable).getByText('Referral sent')).toBeInTheDocument()
    expect(within(outcomeTable).getByText('Somali')).toBeInTheDocument()
  })
})

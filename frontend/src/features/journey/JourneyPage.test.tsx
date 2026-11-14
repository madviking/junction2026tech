import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { JourneyPage } from '@/features/journey/JourneyPage'
import { StageCards } from '@/features/journey/components/StageCards'
import { stageComponentFor } from '@/features/journey/registry'
import { bundle, CODE, stubBackend, visitView } from '@/features/journey/test/fixtures'
import { ContentProvider } from '@/shared/i18n'
import { renderWithProviders } from '@/test/render'
import { vi } from 'vitest'

const visitPath = `/api/visits/${CODE}`

function renderJourney() {
  renderWithProviders(
    <Routes>
      <Route
        path="/r/:lang/v/:code"
        element={
          <ContentProvider lang="en">
            <JourneyPage />
          </ContentProvider>
        }
      />
      <Route path="/r/:lang" element={<p>start page</p>} />
    </Routes>,
    { route: `/r/en/v/${CODE}` },
  )
}

describe('JourneyPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('renders a stage without a registry entry with the default StageCards', async () => {
    expect(stageComponentFor('a_stage_added_in_content')).toBe(StageCards)
    const mystery = visitView({
      stage: { id: 'mystery', outcomes: [], terminal: false, ladder: 0, checkIns: [], overdueNext: null },
      ask: 'A brand new question?',
      outcomes: [{ id: 'fine', text: 'All fine', then: null }],
    })
    const calls = stubBackend({
      'GET /api/content/live': bundle,
      [`GET ${visitPath}`]: mystery,
      [`POST ${visitPath}/events`]: visitView(),
    })

    renderJourney()

    expect(await screen.findByRole('heading', { name: 'A brand new question?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'All fine' }))
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ lang: 'en', outcome: 'fine' }))
  })

  it('shows the full call script with the checked symptoms on the door screen', async () => {
    const line = (key: string | null, fi: string, local: string, item = false) => ({ key, fi, local, item })
    const contact = visitView({
      stage: { id: 'contact', outcomes: [], terminal: false, ladder: 0, checkIns: [], overdueNext: null },
      state: { stage: 'contact', lane: 'U2', route: 'A1', ladderStep: 0, visitDate: null, tries: [] },
      outcomes: [],
      carePath: {
        lane: 'U2', route: 'A1', profile: 'C2', barriers: [], emergency: false,
        destination: { title: 'Contact the health station', door: 'health station', scriptFi: 'x', scriptLocal: 'x', note: '' },
        callScript: [
          { id: 'opening', lines: [line('step.call.greeting', 'Hei.', 'Hello.'), line(null, 'Kieleni on englanti.', 'My language is English.')] },
          { id: 'symptoms', lines: [line('step.call.symptoms', 'Minulla on nämä oireet:', 'I have these symptoms:'), line('card.symptom.lump.card', 'Uusi kyhmy', 'A new lump', true), line('step.call.since.weeks_2_4', 'Ne alkoivat 2–4 viikkoa sitten.', 'They started 2–4 weeks ago.')] },
          { id: 'request', lines: [line('rule.U2.script', 'Olen huolissani näistä oireista.', 'I am worried about these symptoms.')] },
          { id: 'they_ask', lines: [line('step.call.ask.since', 'Milloin oireet alkoivat?', 'When did the symptoms start?')] },
          { id: 'closing', lines: [line('step.call.thanks', 'Kiitos.', 'Thank you.')] },
        ],
        clocks: [], adaptations: [], steps: [], reviewFlags: [],
      },
    })
    stubBackend({ 'GET /api/content/live': bundle, [`GET ${visitPath}`]: contact })
    renderJourney()

    expect(await screen.findByText('• Uusi kyhmy')).toBeInTheDocument()
    expect(screen.getByText('• A new lump')).toBeInTheDocument()
    expect(screen.getByText('Kieleni on englanti.')).toBeInTheDocument()
    expect(screen.getByText('Ne alkoivat 2–4 viikkoa sitten.')).toBeInTheDocument()
    expect(screen.getByText('Olen huolissani näistä oireista.')).toBeInTheDocument()
    expect(screen.getByText('Milloin oireet alkoivat?')).toBeInTheDocument()
    expect(screen.getByText('Kiitos.')).toBeInTheDocument()
  })

  it('shows no "translation not yet checked" notice in a placeholder language', async () => {
    stubBackend({ 'GET /api/content/live': { ...bundle, placeholder: true }, [`GET ${visitPath}`]: visitView() })
    renderJourney()
    expect(await screen.findByRole('heading')).toBeInTheDocument()
    expect(screen.queryByText('Translation not yet checked')).not.toBeInTheDocument()
  })

  it('opens the symptom picker for the lane outcome and sends the chosen symptom ids and duration', async () => {
    const calls = stubBackend({
      'GET /api/content/live': bundle,
      [`GET ${visitPath}`]: visitView(),
      [`POST ${visitPath}/events`]: visitView(),
    })

    renderJourney()

    fireEvent.click(await screen.findByRole('button', { name: 'I have a symptom' }))
    expect(screen.getByRole('heading', { name: 'What worries you?' })).toBeInTheDocument()
    // Continue needs a symptom; "how long" is its own step after it.
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    expect(screen.queryByRole('heading', { name: 'How long have you had them?' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'A new lump' }))
    fireEvent.click(screen.getByRole('button', { name: 'A long cough' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'How long have you had them?' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'What worries you?' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '2 to 4 weeks' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ lang: 'en', outcome: 'symptom', symptoms: ['lump', 'cough'], duration: 'weeks_2_4' }),
    )
  })

  it('reads a confident match back and selects the card only on Yes', async () => {
    const calls = stubBackend({
      'GET /api/content/live': bundle,
      [`GET ${visitPath}`]: visitView(),
      'POST /api/cards/match': { status: 'confirm', top: { id: 'lump', text: 'A new lump', probability: 0.9 }, answer: null, ranked: [] },
    })

    renderJourney()
    fireEvent.click(await screen.findByRole('button', { name: 'I have a symptom' }))
    fireEvent.change(screen.getByLabelText('Describe in your own words'), { target: { value: 'I found a lump in my breast' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))

    const readback = await screen.findByRole('group', { name: 'Did you mean: A new lump?' })
    expect(calls.find((c) => c.path === '/api/cards/match')?.body).toEqual({ lang: 'en', text: 'I found a lump in my breast', set: 'symptoms' })
    expect(screen.getByRole('button', { name: 'A new lump' })).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(within(readback).getByRole('button', { name: 'Yes' }))

    expect(screen.getByRole('button', { name: 'A new lump' })).toHaveAttribute('aria-pressed', 'true')
    expect(calls.some((c) => c.path.endsWith('/events'))).toBe(false)
  })

  it('shows the emergency screen at once and keeps it when the event cannot be saved', async () => {
    const calls = stubBackend({
      'GET /api/content/live': bundle,
      [`GET ${visitPath}`]: visitView(),
      [`POST ${visitPath}/events`]: new Response('offline', { status: 503 }),
    })

    renderJourney()
    // One red control: the 112 link dials directly; the neutral button opens the emergency signs.
    const urgent = await screen.findByRole('button', { name: 'Urgent?' })
    expect(screen.getByRole('link', { name: /112/ })).toHaveAttribute('href', 'tel:112')
    fireEvent.click(urgent)

    // Shown before the server answered, from the loaded content.
    expect(screen.getByText('Call 112 now')).toBeInTheDocument()
    expect(screen.getByText('Chest pain')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'What do you need help with?' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Urgent?' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /112/ })).toHaveLength(1)

    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ lang: 'en', outcome: 'emergency_sign' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Something changed' })).toBeEnabled())
    expect(screen.getByText('Call 112 now')).toBeInTheDocument()
    expect(screen.queryByText('Your answer was not saved.')).not.toBeInTheDocument()
  })

  it('offers "something changed" on the emergency screen to go back', async () => {
    const calls = stubBackend({
      'GET /api/content/live': bundle,
      [`GET ${visitPath}`]: visitView({
        stage: { id: 'emergency', outcomes: [], terminal: true, ladder: 0, checkIns: [], overdueNext: null },
        ask: null,
        outcomes: [],
        interrupts: [{ id: 'something_changed', text: 'Something changed' }],
      }),
      [`POST ${visitPath}/events`]: visitView(),
    })

    renderJourney()
    fireEvent.click(await screen.findByRole('button', { name: 'Something changed' }))

    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ lang: 'en', outcome: 'something_changed' }))
    expect(await screen.findByRole('heading', { name: 'What do you need help with?' })).toBeInTheDocument()
  })

  it('opens the care path overview from any stage and marks the current step', async () => {
    stubBackend({ 'GET /api/content/live': bundle, [`GET ${visitPath}`]: visitView() })

    renderJourney()
    fireEvent.click(await screen.findByRole('button', { name: 'Your path' }))

    expect(screen.getByRole('heading', { name: 'Your path' })).toBeInTheDocument()
    const current = screen.getByRole('listitem', { current: 'step' })
    expect(current).toHaveTextContent('Describe the situation')
    expect(screen.getByText('Silta shows where to go')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'What do you need help with?' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back to my step' }))
    expect(screen.getByRole('heading', { name: 'What do you need help with?' })).toBeInTheDocument()
  })

  it('shows an error with a way back to start for an unknown code', async () => {
    stubBackend({ 'GET /api/content/live': bundle })

    renderJourney()

    expect(await screen.findByText('We could not find this code.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back to start' }))
    expect(await screen.findByText('start page')).toBeInTheDocument()
  })
})

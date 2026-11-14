import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAdminSession, setAdminSession } from '@/features/admin-auth'
import { JourneyEditorPage } from '@/features/admin-journey/JourneyEditorPage'
import { testGraph } from '@/features/admin-journey/testGraph'
import type { JourneyGraph } from '@/features/admin-journey/types'
import { renderWithProviders } from '@/test/render'

type Handler = (url: URL, init: RequestInit) => Response

function stubApi(handlers: Record<string, Handler>) {
  const spy = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input))
    const handler = handlers[`${init.method ?? 'GET'} ${url.pathname}`]
    return handler ? handler(url, init) : Response.json({ code: 'not_found', message: 'no stub' }, { status: 404 })
  })
  vi.stubGlobal('fetch', spy)
  return spy
}

const bodyOf = (spy: ReturnType<typeof stubApi>, path: string) => {
  const call = spy.mock.calls.find(([input, init]) => String(input).endsWith(path) && init?.method === 'POST')
  return call ? (JSON.parse(String(call[1]?.body)) as Record<string, unknown>) : null
}

const GRAPH = '/api/content/admin/journey/graph'

describe('JourneyEditorPage', () => {
  beforeEach(() => {
    setAdminSession({ token: 't', expiresAt: new Date(Date.now() + 3_600_000).toISOString(), user: { id: 1, email: 'a@example.test', displayName: 'A' } })
    Element.prototype.scrollIntoView = vi.fn()
  })
  afterEach(() => {
    clearAdminSession()
    vi.unstubAllGlobals()
  })

  it('shows the stages in columns, a broken link, the issues and the review flags', async () => {
    stubApi({ [`GET ${GRAPH}`]: () => Response.json(testGraph) })
    renderWithProviders(<JourneyEditorPage />)

    const board = await screen.findByRole('region', { name: 'Journey stages' })
    const columns = within(board).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(columns).toEqual(['Start', 'Step 1', 'Step 2', 'Reached by an interrupt', 'Not reachable'])
    expect(within(board).getByText('missing stage nowhere')).toBeInTheDocument()
    expect(within(board).getByText('not reachable')).toBeInTheDocument()

    const aside = screen.getByRole('complementary', { name: 'Validation and review flags' })
    expect(within(aside).getByText('1 error')).toBeInTheDocument()
    expect(within(aside).getByText('1 warning')).toBeInTheDocument()
    expect(within(aside).getByText('journey.stages.contact.outcomes.moved.next')).toBeInTheDocument()
    expect(screen.getByText('The draft has 1 error')).toBeInTheDocument()
  })

  it('keeps review flags folded until asked and jumps from a flag to its stage', async () => {
    stubApi({ [`GET ${GRAPH}`]: () => Response.json(testGraph) })
    renderWithProviders(<JourneyEditorPage />)
    const aside = await screen.findByRole('complementary', { name: 'Validation and review flags' })
    expect(within(aside).getByText('1 legal')).toBeInTheDocument()
    expect(within(aside).queryByText('Outcome contact → refused needs legal review')).not.toBeInTheDocument()

    fireEvent.click(within(aside).getByRole('button', { name: 'Show review flags' }))
    const flag = within(aside).getByText('Outcome contact → refused needs legal review').closest('li')!
    fireEvent.click(within(flag).getByRole('button', { name: 'Show stage contact' }))
    await waitFor(() => expect(document.getElementById('journey-stage-contact')).toHaveAttribute('data-highlighted', 'true'))
  })

  it('shows on each stage where it is reached from', async () => {
    stubApi({ [`GET ${GRAPH}`]: () => Response.json(testGraph) })
    renderWithProviders(<JourneyEditorPage />)
    await screen.findByRole('region', { name: 'Journey stages' })
    const contact = document.getElementById('journey-stage-contact')!
    fireEvent.click(within(contact).getByRole('button', { name: 'Go to stage describe (leads here)' }))
    await waitFor(() => expect(document.getElementById('journey-stage-describe')).toHaveAttribute('data-highlighted', 'true'))
    const emergency = document.getElementById('journey-stage-emergency')!
    expect(within(emergency).getByText(/interrupt emergency_sign/)).toBeInTheDocument()
    const orphan = document.getElementById('journey-stage-orphan')!
    expect(within(orphan).getByText('Nothing leads here.')).toBeInTheDocument()
  })

  it('follows an outcome link to its stage', async () => {
    stubApi({ [`GET ${GRAPH}`]: () => Response.json(testGraph) })
    renderWithProviders(<JourneyEditorPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Go to stage contact' }))
    await waitFor(() => expect(document.getElementById('journey-stage-contact')).toHaveAttribute('data-highlighted', 'true'))
    expect(document.activeElement).toBe(document.getElementById('journey-stage-contact'))
  })

  it('adds an outcome from the drawer and shows the returned graph', async () => {
    const after: JourneyGraph = {
      ...testGraph,
      stages: testGraph.stages.map((s) =>
        s.id === 'describe' ? { ...s, outcomes: [...s.outcomes, { ...s.outcomes[0]!, id: 'letter', card: 'I got a letter', next: 'closed' }] } : s,
      ),
    }
    const spy = stubApi({
      [`GET ${GRAPH}`]: () => Response.json(testGraph),
      'POST /api/content/admin/journey/outcome': () => Response.json(after),
    })
    renderWithProviders(<JourneyEditorPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Add outcome to describe' }))
    const drawer = await screen.findByRole('dialog')
    // Validation in the form first: nothing is sent without the required fields.
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add outcome' }))
    expect(within(drawer).getAllByText('Required').length).toBeGreaterThan(0)
    expect(bodyOf(spy, '/journey/outcome')).toBeNull()

    fireEvent.change(within(drawer).getByLabelText(/Outcome id/), { target: { value: 'letter' } })
    fireEvent.change(within(drawer).getByLabelText(/Card text \(English\)/), { target: { value: 'I got a letter' } })
    fireEvent.change(within(drawer).getByLabelText(/Card text \(Finnish\)/), { target: { value: 'Sain kirjeen' } })
    fireEvent.click(within(drawer).getAllByLabelText(/Leads to/)[0]!)
    fireEvent.click(await screen.findByRole('option', { name: 'closed' }))
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add outcome' }))

    await waitFor(() => expect(bodyOf(spy, '/journey/outcome')).toEqual({ stage: 'describe', id: 'letter', next: 'closed', cardEn: 'I got a letter', cardFi: 'Sain kirjeen' }))
    expect(await screen.findByText('I got a letter')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('removes a stage only after the inline confirmation and shows a refusal in place', async () => {
    const spy = stubApi({
      [`GET ${GRAPH}`]: () => Response.json(testGraph),
      'POST /api/content/admin/journey/stage/remove': () =>
        Response.json({ code: 'failed_precondition', message: 'stage orphan is still used; change these first: journey.stages.x.outcomes.y.next' }, { status: 400 }),
    })
    renderWithProviders(<JourneyEditorPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Remove stage orphan' }))
    expect(bodyOf(spy, '/stage/remove')).toBeNull()
    expect(screen.getByText('Remove stage orphan and its texts?')).toBeInTheDocument()
    // The start stage and closed cannot be removed at all.
    expect(screen.queryByRole('button', { name: 'Remove stage describe' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove stage closed' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm remove' }))
    expect(await screen.findByText(/still used; change these first/)).toBeInTheDocument()
    expect(bodyOf(spy, '/stage/remove')).toEqual({ id: 'orphan' })
  })

  it('says so when the server has the editor turned off', async () => {
    stubApi({ [`GET ${GRAPH}`]: () => Response.json({ ...testGraph, enabled: false, stages: [], interrupts: [], issues: [], reviewFlags: [] }) })
    renderWithProviders(<JourneyEditorPage />)
    expect(await screen.findByText('The journey editor is turned off')).toBeInTheDocument()
  })

  it('shows an error with retry when the graph cannot load', async () => {
    stubApi({ [`GET ${GRAPH}`]: () => Response.json({ code: 'internal', message: 'boom' }, { status: 500 }) })
    renderWithProviders(<JourneyEditorPage />)
    expect(await screen.findByText('Could not load the journey')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})

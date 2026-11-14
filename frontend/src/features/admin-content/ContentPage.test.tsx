import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAdminSession, setAdminSession } from '@/features/admin-auth'
import { ContentPage } from '@/features/admin-content/ContentPage'
import type { DraftDetail, TextsResponse } from '@/features/admin-content/types'
import { renderWithProviders } from '@/test/render'

const languages = [
  { code: 'en', name: 'English', placeholder: false },
  { code: 'fi', name: 'Suomi', placeholder: false },
  { code: 'ar', name: 'العربية', placeholder: true },
]

const texts: TextsResponse = {
  draftExists: true,
  basedOnVersion: 3,
  languages,
  rows: [
    {
      key: 'journey.outcome.contact.no_answer.card',
      group: 'journey.outcome',
      label: 'contact → Nobody answered · card',
      required: true,
      changedInDraft: false,
      entries: [
        { lang: 'en', text: 'Nobody answered', review: 'unchecked', reviewer: null, reviewedAt: null },
        { lang: 'fi', text: 'Kukaan ei vastannut', review: 'checked', reviewer: 'reviewer@example.test', reviewedAt: '2026-11-14T00:00:00Z' },
        { lang: 'ar', text: 'لم يرد أحد', review: 'unchecked', reviewer: null, reviewedAt: null },
      ],
    },
  ],
}

const invalidDraft: DraftDetail = {
  summary: { exists: true, basedOnVersion: 3, errors: 1, warnings: 0, changedKeys: ['lane.U0.name'] },
  issues: [{ severity: 'error', path: 'texts.lane.U0.name.en', message: 'Required text lane.U0.name is missing in en' }],
  docJson: '{}',
}

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

describe('ContentPage', () => {
  beforeEach(() => {
    setAdminSession({ token: 't', expiresAt: new Date(Date.now() + 3_600_000).toISOString(), user: { id: 1, email: 'a@example.test', displayName: 'A' } })
  })
  afterEach(() => {
    clearAdminSession()
    vi.unstubAllGlobals()
  })

  it('saves one language of a text from the drawer', async () => {
    const spy = stubApi({
      'GET /api/content/admin/texts': () => Response.json(texts),
      'GET /api/content/admin/draft': () => Response.json({ ...invalidDraft, summary: { ...invalidDraft.summary, errors: 0 }, issues: [] }),
      'GET /api/content/admin/review-flags': () => Response.json({ flags: [] }),
      'PUT /api/content/admin/texts': () => Response.json({ exists: true, basedOnVersion: 3, errors: 0, warnings: 0, changedKeys: ['journey.outcome.contact.no_answer.card'] }),
    })
    renderWithProviders(<ContentPage />)

    fireEvent.click(await screen.findByText('contact → Nobody answered · card'))
    const field = await screen.findByLabelText('English (en)')
    fireEvent.change(field, { target: { value: 'Nobody picked up' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save EN' }))

    await waitFor(() => expect(spy.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(true))
    const put = spy.mock.calls.find(([, init]) => init?.method === 'PUT')
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({ key: 'journey.outcome.contact.no_answer.card', lang: 'en', text: 'Nobody picked up' })
    // The Arabic field is right-to-left.
    expect(screen.getByLabelText(/العربية/).closest('[dir]')).toHaveAttribute('dir', 'rtl')
  })

  it('shows the issues of a refused publish and says nothing was published', async () => {
    stubApi({
      'GET /api/content/admin/texts': () => Response.json(texts),
      'GET /api/content/admin/draft': () => Response.json(invalidDraft),
      'GET /api/content/admin/review-flags': () => Response.json({ flags: [] }),
      'POST /api/content/admin/publish': () =>
        Response.json(
          {
            code: 'invalid_argument',
            message: 'the draft is invalid; nothing was published',
            details: { issues: [{ severity: 'error', path: 'texts.rule.R1.en', message: 'Rule R1 has no English text' }] },
          },
          { status: 400 },
        ),
    })
    renderWithProviders(<ContentPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Publish' }))

    const banner = (await screen.findByText('Nothing was published')).closest('div') as HTMLElement
    expect(await screen.findByText('Rule R1 has no English text')).toBeInTheDocument()
    expect(within(banner.parentElement as HTMLElement).getByText('the draft is invalid; nothing was published')).toBeInTheDocument()
    // The draft's own issues are listed too.
    expect(screen.getByText('Required text lane.U0.name is missing in en')).toBeInTheDocument()
  })
})

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LetterEntryCard } from '@/features/letter/components/LetterEntryCard'
import { LetterPage } from '@/features/letter/LetterPage'
import type { LetterExplanation, LiveBundle } from '@/shared/api/types'
import { ContentProvider } from '@/shared/i18n'
import { renderWithProviders } from '@/test/render'

// Texts are left out on purpose: a missing key renders as the key itself, so the
// assertions read the keys the screens use.
const bundle = {
  version: 1,
  lang: 'so',
  dir: 'ltr',
  placeholder: true,
  languages: [{ code: 'so', name: 'Soomaali', dir: 'ltr', placeholder: true, profile: 'C3' }],
  texts: {},
  journey: { start: 'describe', interrupts: [], routeFact: { askAt: 'route', questions: 0, ifUnknownRoute: 'A1', ifUnknownReview: null }, stages: [] },
  cards: { symptoms: [], emergencySigns: [], clinicianStage: 'visit', clinician: [] },
  lanes: [],
  routes: [],
} satisfies LiveBundle

const explained: LetterExplanation = {
  status: 'explained',
  lang: 'so',
  kind: 'screening_cervical',
  guide: 'cervical',
  title: 'Casuumaad baaritaan',
  summary: 'Warqaddani waxay kugu casuumaysaa baaritaan bilaash ah.',
  actions: ['Tag ballanta.', 'Qaado kaarka Kela.'],
  when: 'ti 24.11.2026 klo 9.40',
  where: 'HUSLAB Kalasatama',
  phone: '09 471 86800',
}

// Only the network boundary is stubbed: the content bundle and the explain endpoint.
function stubApi(explain: () => Response) {
  const requests: { lang: string; imageBase64: string; mime: string }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      if (!String(input).includes('/api/letters/explain')) return Response.json(bundle)
      requests.push(JSON.parse(String(init?.body)))
      return explain()
    }),
  )
  return requests
}

const photo = () => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], 'letter.jpg', { type: 'image/jpeg' })

function renderPage() {
  renderWithProviders(
    <Routes>
      <Route path="/r/:lang" element={<ContentProvider lang="so"><LetterEntryCard lang="so" /></ContentProvider>} />
      <Route path="/r/:lang/letter" element={<ContentProvider lang="so"><LetterPage /></ContentProvider>} />
      <Route path="/r/:lang/learn/cervical" element={<p>cervical guide</p>} />
    </Routes>,
    { route: '/r/so' },
  )
}

async function takePhoto(user: ReturnType<typeof userEvent.setup>, name: string) {
  const button = await screen.findByRole('button', { name })
  // PhotoButton renders its file input right after the button.
  const input = button.parentElement?.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('no file input next to the photo button')
  await user.upload(input, photo())
}

describe('I got a letter', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('goes from the start card to the photo screen, sends the photo and shows the explanation', async () => {
    const requests = stubApi(() => Response.json(explained))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /ui\.letter\.entry_title/ }))
    // The privacy promise is on screen before the camera opens.
    expect(await screen.findByText('ui.letter.privacy')).toBeInTheDocument()
    const camera = screen.getByRole('button', { name: 'ui.letter.take_photo' })
    expect(camera.parentElement?.querySelector('input[type="file"]')).toHaveAttribute('capture', 'environment')

    await takePhoto(user, 'ui.letter.take_photo')

    expect(await screen.findByRole('heading', { name: 'Casuumaad baaritaan' })).toBeInTheDocument()
    expect(requests).toEqual([{ lang: 'so', mime: 'image/jpeg', imageBase64: '/9j/4AECAw==' }])
    expect(screen.getByText(explained.summary)).toBeInTheDocument()
    // Facts stay as printed, marked as Finnish left-to-right text.
    expect(screen.getByText('ti 24.11.2026 klo 9.40').closest('[lang="fi"]')).toHaveAttribute('dir', 'ltr')
    expect(screen.getByRole('link', { name: 'ui.letter.call' })).toHaveAttribute('href', 'tel:0947186800')
    expect(screen.getByText('Qaado kaarka Kela.')).toBeInTheDocument()
    expect(screen.getByText('ui.letter.machine_text')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'ui.letter.guide_cervical' }))
    expect(await screen.findByText('cervical guide')).toBeInTheDocument()
  })

  it('asks for a new photo when the letter could not be read', async () => {
    stubApi(() => Response.json({ status: 'unreadable', lang: 'so', kind: 'other', title: '', summary: '', actions: [] }))
    const user = userEvent.setup()
    renderWithProviders(<Routes><Route path="/r/:lang/letter" element={<ContentProvider lang="so"><LetterPage /></ContentProvider>} /></Routes>, { route: '/r/so/letter' })

    await takePhoto(user, 'ui.letter.choose_photo')

    expect(await screen.findByText('ui.letter.unreadable_title')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ui.letter.take_photo' })).toBeInTheDocument()
  })

  it('shows an error with retry when the service fails, and retry sends the same photo', async () => {
    let fail = true
    const requests = stubApi(() => (fail ? Response.json({ code: 'unavailable', message: 'down' }, { status: 503 }) : Response.json(explained)))
    const user = userEvent.setup()
    renderWithProviders(<Routes><Route path="/r/:lang/letter" element={<ContentProvider lang="so"><LetterPage /></ContentProvider>} /></Routes>, { route: '/r/so/letter' })

    await takePhoto(user, 'ui.letter.take_photo')
    expect(await screen.findByText('ui.letter.error_title')).toBeInTheDocument()

    fail = false
    await user.click(screen.getByRole('button', { name: 'ui.letter.retry' }))

    expect(await screen.findByRole('heading', { name: 'Casuumaad baaritaan' })).toBeInTheDocument()
    await waitFor(() => expect(requests).toHaveLength(2))
    expect(requests[1]).toEqual(requests[0])
  })
})

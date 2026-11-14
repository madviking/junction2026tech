import { fireEvent, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CervicalLearnPage } from '@/features/screening/CervicalLearnPage'
import { CervicalLetterPage } from '@/features/screening/CervicalLetterPage'
import { cervicalCourse } from '@/features/screening/cervicalCourse'
import type { LiveBundle } from '@/shared/api/types'
import { ContentProvider } from '@/shared/i18n'
import { renderWithProviders } from '@/test/render'

// Texts are left out on purpose: a missing key renders as the key itself, so the
// assertions read the keys the screens use.
const bundle = {
  version: 1,
  lang: 'so',
  dir: 'ltr',
  placeholder: true,
  languages: [
    { code: 'en', name: 'English', dir: 'ltr', placeholder: false, profile: 'C2' },
    { code: 'so', name: 'Soomaali', dir: 'ltr', placeholder: true, profile: 'C3' },
  ],
  texts: {},
  journey: { start: 'describe', interrupts: [], routeFact: { askAt: 'route', questions: 0, ifUnknownRoute: 'A1', ifUnknownReview: null }, stages: [] },
  cards: { symptoms: [], emergencySigns: [], clinicianStage: 'visit', clinician: [] },
  lanes: [],
  routes: [],
} satisfies LiveBundle

const withContent = (lang: string, page: React.ReactNode) => <ContentProvider lang={lang}>{page}</ContentProvider>

describe('cervical screening guide', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('walks from the overview through every part to the end, then links to the letter', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(bundle)))
    renderWithProviders(
      <Routes>
        <Route path="/r/:lang/learn/cervical" element={withContent('so', <CervicalLearnPage />)} />
        <Route path="/letter/cervical/:lang" element={<p>letter page</p>} />
      </Routes>,
      { route: '/r/so/learn/cervical' },
    )

    expect(await screen.findByRole('heading', { name: 'ui.screening.learn.title' })).toBeInTheDocument()
    // Overview lists every part.
    for (const part of cervicalCourse) expect(screen.getByText(`ui.screening.learn.${part.id}.title`)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'ui.screening.learn.start' }))
    for (const part of cervicalCourse) {
      expect(await screen.findByRole('heading', { name: `ui.screening.learn.${part.id}.title` })).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(cervicalCourse.indexOf(part) + 1))
      fireEvent.click(screen.getByRole('button', { name: 'ui.screening.learn.next' }))
    }

    expect(await screen.findByText('ui.screening.learn.done_title')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'ui.screening.learn.to_letter' }))
    expect(await screen.findByText('letter page')).toBeInTheDocument()
  })

  it('opens a question to show its answer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(bundle)))
    renderWithProviders(
      <Routes>
        <Route path="/r/:lang/learn/cervical" element={withContent('so', <CervicalLearnPage />)} />
      </Routes>,
      { route: '/r/so/learn/cervical?part=faq' },
    )

    const question = await screen.findByText('ui.screening.learn.faq.hurt_q')
    const details = question.closest('details')
    expect(details).not.toHaveAttribute('open')
    fireEvent.click(question)
    expect(details).toHaveAttribute('open')
    expect(screen.getByText('ui.screening.learn.faq.hurt_a')).toBeInTheDocument()
  })

  it('shows the Finnish phrases for the desk in the rights part', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(bundle)))
    renderWithProviders(
      <Routes>
        <Route path="/r/:lang/learn/cervical" element={withContent('so', <CervicalLearnPage />)} />
      </Routes>,
      { route: '/r/so/learn/cervical?part=rights' },
    )

    expect(await screen.findByText('ui.screening.learn.rights.female')).toBeInTheDocument()
    expect(screen.getByText('ui.screening.learn.phrase.female_fi')).toBeInTheDocument()
    expect(screen.getByText('ui.screening.learn.phrase.female_meaning')).toBeInTheDocument()
  })
})

describe('example invitation letter', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('renders the letter in the route language with the QR code for that language and switches language', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(bundle)))
    renderWithProviders(
      <Routes>
        <Route path="/letter/cervical/:lang" element={withContent('so', <CervicalLetterPage />)} />
        <Route path="/r/:lang/learn/cervical" element={<p>guide page</p>} />
      </Routes>,
      { route: '/letter/cervical/so' },
    )

    expect(await screen.findByRole('heading', { name: 'ui.screening.letter.title' })).toBeInTheDocument()
    expect(screen.getByRole('article')).toHaveAttribute('lang', 'so')
    expect(screen.getByRole('img', { name: 'ui.screening.letter.qr_alt' })).toHaveAttribute('src', '/qr/letter-cervical-so.svg')
    expect(screen.getByText('ui.screening.letter.appt_time')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'ui.screening.letter.open_guide' }))
    expect(await screen.findByText('guide page')).toBeInTheDocument()
  })
})

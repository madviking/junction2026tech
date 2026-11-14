import { fireEvent, screen, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { JourneyPage } from '@/features/journey/JourneyPage'
import { bundle, CODE, stubBackend, visitView } from '@/features/journey/test/fixtures'
import type { ResolvedText } from '@/shared/api/types'
import { ContentProvider } from '@/shared/i18n'
import { renderWithProviders } from '@/test/render'

const text = (value: string): ResolvedText => ({ text: value, lang: 'en', review: 'checked', fallback: false })

const pictureBundle = {
  ...bundle,
  texts: {
    ...bundle.texts,
    'ui.journey.body.label': text('Where do you feel it?'),
    'ui.journey.body.region.head': text('Head and neck'),
    'ui.journey.body.region.chest': text('Chest and breast'),
    'ui.journey.body.region.belly': text('Belly and bottom'),
    'ui.journey.body.show_list': text('Show as a list'),
    'ui.journey.body.show_pictures': text('Show pictures'),
  },
}

function renderPicker() {
  stubBackend({ 'GET /api/content/live': pictureBundle, [`GET /api/visits/${CODE}`]: visitView() })
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
    </Routes>,
    { route: `/r/en/v/${CODE}` },
  )
}

describe('SymptomPicker pictures view', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows a body map by default with only the parts that have symptoms, and every card', async () => {
    renderPicker()
    fireEvent.click(await screen.findByRole('button', { name: 'I have a symptom' }))

    const map = screen.getByRole('group', { name: 'Where do you feel it?' })
    // lump → head and chest, cough → chest; nothing maps to the belly in this fixture.
    expect(within(map).getByRole('button', { name: 'Head and neck' })).toHaveAttribute('aria-pressed', 'false')
    expect(within(map).getByRole('button', { name: 'Chest and breast' })).toBeInTheDocument()
    expect(within(map).queryByRole('button', { name: 'Belly and bottom' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'A new lump' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'A long cough' })).toBeInTheDocument()
  })

  it('narrows the cards to the tapped body part and shows all again on a second tap', async () => {
    renderPicker()
    fireEvent.click(await screen.findByRole('button', { name: 'I have a symptom' }))
    const head = screen.getByRole('button', { name: 'Head and neck' })

    fireEvent.click(head)
    expect(head).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'A new lump' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'A long cough' })).not.toBeInTheDocument()

    fireEvent.click(head)
    expect(head).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'A long cough' })).toBeInTheDocument()
  })

  it('keeps a chosen card chosen when the cards are narrowed', async () => {
    renderPicker()
    fireEvent.click(await screen.findByRole('button', { name: 'I have a symptom' }))

    fireEvent.click(screen.getByRole('button', { name: 'A long cough' }))
    fireEvent.click(screen.getByRole('button', { name: 'Chest and breast' }))
    expect(screen.getByRole('button', { name: 'A long cough' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('switches to the plain list and back', async () => {
    renderPicker()
    fireEvent.click(await screen.findByRole('button', { name: 'I have a symptom' }))

    fireEvent.click(screen.getByRole('button', { name: 'Show as a list' }))
    expect(screen.queryByRole('group', { name: 'Where do you feel it?' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'A new lump' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show pictures' }))
    expect(screen.getByRole('group', { name: 'Where do you feel it?' })).toBeInTheDocument()
  })
})

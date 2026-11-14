import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCardMatch } from '@/features/journey/api/useCardMatch'
import { MatchInput } from '@/features/journey/components/MatchInput'
import { bundle, stubBackend } from '@/features/journey/test/fixtures'
import { ContentProvider } from '@/shared/i18n'
import { renderWithProviders } from '@/test/render'

function Harness({ onChosen }: { onChosen: (id: string) => void }) {
  const match = useCardMatch('en')
  return <MatchInput set="outcomes" stage="contact" match={match} onChosen={onChosen} />
}

function renderMatch(onChosen: (id: string) => void) {
  renderWithProviders(
    <ContentProvider lang="en">
      <Harness onChosen={onChosen} />
    </ContentProvider>,
  )
}

async function ask(text: string) {
  fireEvent.change(await screen.findByLabelText('Describe in your own words'), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'Check' }))
}

describe('MatchInput', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('confirm: reads the card back and calls onChosen on Yes', async () => {
    const calls = stubBackend({
      'GET /api/content/live': bundle,
      'POST /api/cards/match': { status: 'confirm', top: { id: 'no_answer', text: 'Nobody answered', probability: 0.92 }, ranked: [] },
    })
    const onChosen = vi.fn()
    renderMatch(onChosen)

    await ask('they never picked up')
    const readback = await screen.findByRole('group', { name: 'Did you mean: Nobody answered?' })
    expect(onChosen).not.toHaveBeenCalled()
    expect(calls.find((c) => c.path === '/api/cards/match')?.body).toEqual({
      lang: 'en',
      text: 'they never picked up',
      set: 'outcomes',
      stage: 'contact',
    })

    fireEvent.click(within(readback).getByRole('button', { name: 'Yes' }))
    expect(onChosen).toHaveBeenCalledWith('no_answer')
  })

  it('No on the read-back chooses nothing', async () => {
    stubBackend({
      'GET /api/content/live': bundle,
      'POST /api/cards/match': { status: 'confirm', top: { id: 'no_answer', text: 'Nobody answered', probability: 0.92 }, ranked: [] },
    })
    const onChosen = vi.fn()
    renderMatch(onChosen)

    await ask('they never picked up')
    fireEvent.click(within(await screen.findByRole('group')).getByRole('button', { name: 'No' }))

    expect(await screen.findByText('Please choose a card.')).toBeInTheDocument()
    expect(onChosen).not.toHaveBeenCalled()
  })

  it('choose: shows a short message, no read-back and no automatic choice', async () => {
    stubBackend({
      'GET /api/content/live': bundle,
      'POST /api/cards/match': { status: 'choose', top: null, ranked: [] },
    })
    const onChosen = vi.fn()
    renderMatch(onChosen)

    await ask('hmm')

    expect(await screen.findByText('Please choose a card.')).toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    expect(onChosen).not.toHaveBeenCalled()
  })
})

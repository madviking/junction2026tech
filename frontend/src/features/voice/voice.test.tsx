import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { CardAudioButton, RecordAnswerButton } from '@/features/voice'
import { resetPlayerForTests } from '@/features/voice/state/player'
import type { LiveBundle } from '@/shared/api/types'
import { ContentProvider } from '@/shared/i18n'
import { renderWithProviders } from '@/test/render'

const texts: Record<string, string> = {
  'ui.voice.play': 'Listen',
  'ui.voice.stop': 'Stop listening',
  'ui.voice.loading': 'Loading audio',
  'ui.voice.error': 'Audio did not work',
  'ui.voice.unchecked': 'audio not yet checked',
  'ui.voice.record': 'Tap to speak',
  'ui.voice.recording': 'Recording. Tap to stop.',
  'ui.voice.processing': 'Listening to your answer',
  'ui.voice.mic_denied': 'Microphone is not allowed',
  'ui.voice.record_error': 'Recording did not work',
  'ui.voice.no_speech': 'We did not hear anything',
}

function bundle(lang: string): LiveBundle {
  const resolved = Object.fromEntries(Object.entries(texts).map(([k, text]) => [k, { text, lang, review: 'approved', fallback: false }]))
  return { version: 1, lang, dir: 'ltr', placeholder: lang === 'so', texts: resolved } as unknown as LiveBundle
}

const capabilities = {
  languages: [
    { lang: 'en', mode: 'full_voice', voiceInput: true, audioOutput: true, generatedAudioReview: 'approved' },
    { lang: 'so', mode: 'cards_with_audio', voiceInput: false, audioOutput: true, generatedAudioReview: 'unchecked' },
    { lang: 'xx', mode: 'cards_with_audio', voiceInput: false, audioOutput: false, generatedAudioReview: 'unchecked' },
  ],
}

let fetchMock: ReturnType<typeof vi.fn>

/** Stub the network boundary: content, capabilities, clips and transcription. */
function stubBackend({ transcript = 'I have found a new lump in my breast' } = {}) {
  fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    if (url.pathname === '/api/content/live') return Response.json(bundle(url.searchParams.get('lang') ?? 'en'))
    if (url.pathname === '/api/voice/capabilities') return Response.json(capabilities)
    if (url.pathname === '/api/voice/clip') {
      const lang = url.searchParams.get('lang')
      const id = url.searchParams.get('key') === 'card.symptom.cough.card' ? 2 : 1
      return Response.json({ url: `/api/voice/blob/${id}`, source: 'generated', review: lang === 'so' ? 'unchecked' : 'approved', textHash: 'h' })
    }
    if (url.pathname === '/api/voice/transcribe' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as { lang: string }
      return Response.json({ text: transcript, lang: body.lang })
    }
    return new Response('not found', { status: 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
}

const calls = (path: string) => fetchMock.mock.calls.filter(([input]) => new URL(String(input)).pathname === path)

function renderIn(lang: string, ui: ReactElement) {
  return renderWithProviders(<ContentProvider lang={lang}>{ui}</ContentProvider>)
}

describe('CardAudioButton', () => {
  let playSpy: Mock<() => Promise<void>>
  let pauseSpy: Mock<() => void>

  beforeEach(() => {
    playSpy = vi.fn(async (): Promise<void> => {})
    pauseSpy = vi.fn((): void => {})
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(playSpy)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(pauseSpy)
    resetPlayerForTests()
    pauseSpy.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('looks up the clip on press and plays it', async () => {
    stubBackend()
    renderIn('en', <CardAudioButton textKey="card.symptom.lump.card" label="Listen: lump" />)

    const button = await screen.findByRole('button', { name: 'Listen: lump' })
    expect(calls('/api/voice/clip')).toHaveLength(0)

    await userEvent.click(button)

    expect(await screen.findByRole('button', { name: 'Stop listening' })).toHaveAttribute('aria-pressed', 'true')
    const clipUrl = new URL(String(calls('/api/voice/clip')[0]![0]))
    expect(clipUrl.searchParams.get('key')).toBe('card.symptom.lump.card')
    expect(clipUrl.searchParams.get('lang')).toBe('en')
    expect(playSpy).toHaveBeenCalledTimes(1)
    expect((playSpy.mock.contexts[0] as HTMLAudioElement).src).toMatch(/\/api\/voice\/blob\/1$/)

    await userEvent.click(screen.getByRole('button', { name: 'Stop listening' }))
    expect(await screen.findByRole('button', { name: 'Listen: lump' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('stops the previous clip when another one starts', async () => {
    stubBackend()
    renderIn(
      'en',
      <>
        <CardAudioButton textKey="card.symptom.lump.card" label="Lump" />
        <CardAudioButton textKey="card.symptom.cough.card" label="Cough" />
      </>,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Lump' }))
    await screen.findByRole('button', { name: 'Stop listening' })
    await userEvent.click(screen.getByRole('button', { name: 'Cough' }))

    await waitFor(() => expect((playSpy.mock.contexts[1] as HTMLAudioElement | undefined)?.src).toMatch(/\/api\/voice\/blob\/2$/))
    expect(pauseSpy).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Lump' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getAllByRole('button', { name: 'Stop listening' })).toHaveLength(1)
  })

  it('shows the error state when the audio cannot play', async () => {
    stubBackend()
    playSpy.mockRejectedValueOnce(new Error('NotSupportedError'))
    renderIn('en', <CardAudioButton textKey="card.symptom.lump.card" />)
    await userEvent.click(await screen.findByRole('button', { name: 'Listen' }))
    expect(await screen.findByRole('button', { name: 'Audio did not work' })).toBeInTheDocument()
  })

  it('marks unchecked (Somali generated) audio in the accessible name', async () => {
    stubBackend()
    renderIn('so', <CardAudioButton textKey="card.symptom.lump.card" />)
    expect(await screen.findByRole('button', { name: 'Listen (audio not yet checked)' })).toBeInTheDocument()
  })

  it('renders nothing for a language without audio output', async () => {
    stubBackend()
    renderIn(
      'xx',
      <>
        <p>card text</p>
        <CardAudioButton textKey="card.symptom.lump.card" />
      </>,
    )
    await screen.findByText('card text')
    await waitFor(() => expect(calls('/api/voice/capabilities')).toHaveLength(1))
    await act(async () => {})
    expect(screen.queryByRole('button')).toBeNull()
  })
})

class FakeMediaRecorder {
  static isTypeSupported = (mime: string) => mime === 'audio/webm;codecs=opus'
  static instances: FakeMediaRecorder[] = []
  state: 'inactive' | 'recording' = 'inactive'
  mimeType: string
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  constructor(_stream: MediaStream, options?: { mimeType?: string }) {
    this.mimeType = options?.mimeType ?? ''
    FakeMediaRecorder.instances.push(this)
  }
  start() {
    this.state = 'recording'
  }
  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['fake-opus'], { type: this.mimeType }) })
    this.onstop?.()
  }
}

describe('RecordAnswerButton', () => {
  const trackStop = vi.fn()
  let getUserMedia: ReturnType<typeof vi.fn>

  beforeEach(() => {
    FakeMediaRecorder.instances = []
    getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop: trackStop }] }))
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(navigator, 'mediaDevices')
  })

  it('records, sends base64 audio with the language and passes the transcript on', async () => {
    stubBackend()
    const onTranscript = vi.fn()
    renderIn('en', <RecordAnswerButton onTranscript={onTranscript} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Tap to speak' }))
    const stopButton = await screen.findByRole('button', { name: 'Recording. Tap to stop.' })
    expect(FakeMediaRecorder.instances[0]!.mimeType).toBe('audio/webm;codecs=opus')
    await userEvent.click(stopButton)

    await waitFor(() => expect(onTranscript).toHaveBeenCalledWith('I have found a new lump in my breast'))
    const [, init] = calls('/api/voice/transcribe')[0]!
    const body = JSON.parse(String((init as RequestInit).body)) as { lang: string; audioBase64: string; mime: string }
    expect(body.lang).toBe('en')
    expect(atob(body.audioBase64)).toBe('fake-opus')
    expect(body.mime).toBe('audio/webm;codecs=opus')
    expect(trackStop).toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: 'Tap to speak' })).toBeInTheDocument()
  })

  it('explains a denied microphone and stays usable', async () => {
    stubBackend()
    getUserMedia.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
    renderIn('en', <RecordAnswerButton onTranscript={vi.fn()} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Tap to speak' }))
    expect(await screen.findByText('Microphone is not allowed')).toBeInTheDocument()
    expect(calls('/api/voice/transcribe')).toHaveLength(0)
  })

  it('tells the resident when nothing was heard', async () => {
    stubBackend({ transcript: '  ' })
    const onTranscript = vi.fn()
    renderIn('en', <RecordAnswerButton onTranscript={onTranscript} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Tap to speak' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Recording. Tap to stop.' }))
    expect(await screen.findByText('We did not hear anything')).toBeInTheDocument()
    expect(onTranscript).not.toHaveBeenCalled()
  })

  it('renders no record button in Somali (no voice input)', async () => {
    stubBackend()
    renderIn(
      'so',
      <>
        <p>cards</p>
        <RecordAnswerButton onTranscript={vi.fn()} />
      </>,
    )
    await screen.findByText('cards')
    await waitFor(() => expect(calls('/api/voice/capabilities')).toHaveLength(1))
    await act(async () => {})
    expect(screen.queryByRole('button')).toBeNull()
  })
})

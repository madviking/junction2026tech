// Resident speech-to-text. The recording and the transcript live only for the length of
// the request: never stored, never logged (only lengths and status are logged).
import { APIError } from 'encore.dev/api'
import log from 'encore.dev/log'
import { ProviderError } from './adapter'
import { decodeAudio, wavDurationSecs } from './audio'
import { STT_MODEL, languageVoice, sttCostUsd } from './capabilities'
import { FAKE_MODEL } from './fake'
import { pickProvider } from './providers.config'
import * as repo from './repository'

export const MAX_RECORDING_BYTES = 2 * 1024 * 1024
export const MAX_RECORDING_SECS = 30
// Fallback when neither the provider nor a WAV header gives the length: ~32 kbit/s Opus.
const FALLBACK_BYTES_PER_SEC = 4000

export interface Transcript {
  text: string
  lang: string
}

export async function transcribe(lang: string, audioBase64: string, mime: string): Promise<Transcript> {
  const cap = languageVoice(lang)
  if (!cap) throw APIError.invalidArgument(`unknown language ${lang}`)
  if (!cap.voiceInput) throw APIError.failedPrecondition(`voice input is not offered in ${lang}; use the cards`)
  const audio = decodeAudio(audioBase64, mime, MAX_RECORDING_BYTES)
  const wavSecs = audio.mime === 'audio/wav' ? wavDurationSecs(audio.bytes) : null
  if (wavSecs !== null && wavSecs > MAX_RECORDING_SECS) throw APIError.invalidArgument(`recording longer than ${MAX_RECORDING_SECS} s`)

  const provider = pickProvider(await repo.totalSpendUsd(), 'stt')
  const model = provider.name === 'fake' ? FAKE_MODEL : STT_MODEL
  try {
    const out = await provider.stt({ bytes: audio.bytes, mime: audio.mime, lang: cap.providerLang, model })
    const seconds = out.durationSecs ?? wavSecs ?? audio.bytes.length / FALLBACK_BYTES_PER_SEC
    const costUsd = provider.name === 'fake' ? 0 : sttCostUsd(seconds)
    await repo.insertUsage({ provider: provider.name, feature: 'stt.resident', model, characters: 0, seconds, costUsd, status: 'ok' })
    log.info('voice stt done', { lang, bytes: audio.bytes.length, seconds: Math.round(seconds * 10) / 10, transcriptChars: out.text.length, provider: provider.name })
    return { text: out.text, lang }
  } catch (err) {
    if (!(err instanceof ProviderError)) throw err
    await repo.insertUsage({ provider: provider.name, feature: 'stt.resident', model, characters: 0, seconds: 0, costUsd: 0, status: 'provider_error' })
    log.warn('voice stt failed', { lang, bytes: audio.bytes.length, status: err.status })
    throw APIError.unavailable('speech-to-text is not available right now')
  }
}

// The only file that talks to ElevenLabs. Calls follow
// docs/planning/2026-11-14-provider-api-notes.md and the API reference pages
// (text-to-speech/convert, speech-to-text/convert) read on 2026-11-14.
import { secret } from 'encore.dev/config'
import log from 'encore.dev/log'
import { ProviderError, type SttRequest, type SttResult, type TtsRequest, type TtsResult, type VoiceProvider } from './adapter'
import { TTS_MIME, TTS_OUTPUT_FORMAT } from './capabilities'

const elevenLabsApiKey = secret('ElevenLabsApiKey')

export const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io'
const TTS_TIMEOUT_MS = 30_000
const STT_TIMEOUT_MS = 60_000

const EXT: Record<string, string> = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a' }

interface SttResponse {
  text?: string
  language_code?: string
  audio_duration_secs?: number
  words?: { end?: number }[]
}

// Error bodies are 422 {detail:[{loc,msg,type}]}; log only the error type and status,
// never the request (it may contain a resident's recording).
async function fail(what: string, response: Response): Promise<never> {
  let detailType = 'unknown'
  try {
    const body = (await response.json()) as { detail?: { type?: string }[] | { status?: string } }
    detailType = Array.isArray(body.detail) ? (body.detail[0]?.type ?? 'unknown') : (body.detail?.status ?? 'unknown')
  } catch (err) {
    detailType = err instanceof Error ? `unparsable:${err.name}` : 'unparsable'
  }
  log.warn('elevenlabs call failed', { what, status: response.status, detailType })
  throw new ProviderError(response.status, `elevenlabs_${what}_http_${response.status}`)
}

export const elevenLabs: VoiceProvider = {
  name: 'elevenlabs',

  async tts(req: TtsRequest): Promise<TtsResult> {
    const outputFormat = req.outputFormat ?? TTS_OUTPUT_FORMAT
    const url = `${ELEVENLABS_BASE_URL}/v1/text-to-speech/${encodeURIComponent(req.voiceId)}?output_format=${outputFormat}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'audio/*', 'xi-api-key': elevenLabsApiKey() },
      body: JSON.stringify({ text: req.text, model_id: req.model, language_code: req.lang }),
      signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
    })
    if (!response.ok) return fail('tts', response)
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length === 0) throw new ProviderError(502, 'elevenlabs_tts_empty_audio')
    const mime = outputFormat.startsWith('wav_') ? 'audio/wav' : TTS_MIME
    return { bytes, mime, model: req.model, voiceId: req.voiceId }
  },

  async stt(req: SttRequest): Promise<SttResult> {
    const form = new FormData()
    form.append('model_id', req.model)
    form.append('language_code', req.lang)
    form.append('tag_audio_events', 'false')
    // A list field: one form entry per term (speech-to-text/convert, read 2026-11-14).
    for (const term of req.keyterms ?? []) form.append('keyterms', term)
    form.append('file', new Blob([new Uint8Array(req.bytes)], { type: req.mime }), `recording.${EXT[req.mime] ?? 'bin'}`)
    const response = await fetch(`${ELEVENLABS_BASE_URL}/v1/speech-to-text`, {
      method: 'POST',
      headers: { 'xi-api-key': elevenLabsApiKey() },
      body: form,
      signal: AbortSignal.timeout(STT_TIMEOUT_MS),
    })
    if (!response.ok) return fail('stt', response)
    const data = (await response.json()) as SttResponse
    const lastEnd = data.words?.length ? (data.words[data.words.length - 1]?.end ?? null) : null
    return {
      text: (data.text ?? '').trim(),
      lang: data.language_code ?? req.lang,
      durationSecs: data.audio_duration_secs ?? lastEnd,
    }
  },
}

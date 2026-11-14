// Public voice endpoints (anonymous): capabilities, clip lookup, audio bytes, speech-to-text.
import { api } from 'encore.dev/api'
import log from 'encore.dev/log'
import * as service from './service'
import { transcribe as transcribeAudio, type Transcript } from './stt'

export const capabilities = api(
  { expose: true, method: 'GET', path: '/api/voice/capabilities' },
  async (): Promise<service.Capabilities> => service.capabilities(),
)

// The clip to play for a text key in a language (generated on first request).
export const clip = api(
  { expose: true, method: 'GET', path: '/api/voice/clip' },
  async (req: { key: string; lang: string }): Promise<service.ClipView> => service.resolveClip(await service.liveDoc(), req.key, req.lang),
)

// Audio bytes. Blobs never change, so they are cached for a year.
export const blob = api.raw({ expose: true, method: 'GET', path: '/api/voice/blob/:id' }, async (req, resp) => {
  const id = Number((req.url ?? '').split('?')[0]!.split('/').pop())
  try {
    const b = await service.getBlob(id)
    if (!b) {
      resp.writeHead(404, { 'content-type': 'application/json' })
      resp.end(JSON.stringify({ code: 'not_found', message: 'no such audio' }))
      return
    }
    const etag = `"${b.textHash.slice(0, 16)}-${b.id}"`
    const headers = { etag, 'cache-control': 'public, max-age=31536000, immutable' }
    if (req.headers['if-none-match'] === etag) {
      resp.writeHead(304, headers)
      resp.end()
      return
    }
    resp.writeHead(200, { ...headers, 'content-type': b.mime, 'content-length': String(b.bytes.length) })
    resp.end(b.bytes)
  } catch (err) {
    log.error('voice blob read failed', { id, error: err instanceof Error ? err.message : String(err) })
    resp.writeHead(500, { 'content-type': 'application/json' })
    resp.end(JSON.stringify({ code: 'internal', message: 'audio read failed' }))
  }
})

// Speech-to-text for residents. Nothing about the recording or transcript is kept.
export const transcribe = api(
  { expose: true, method: 'POST', path: '/api/voice/transcribe' },
  async (req: { lang: string; audioBase64: string; mime: string }): Promise<Transcript> => transcribeAudio(req.lang, req.audioBase64, req.mime),
)

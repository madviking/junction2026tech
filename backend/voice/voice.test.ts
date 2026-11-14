// Voice against Encore's test database. Only ElevenLabs (fetch) is stubbed.
// Texts get a unique suffix per run, so generated-audio dedupe never hides a provider call.
import { randomUUID } from 'node:crypto'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { ContentDoc } from '../care_paths/domain/types'
import { adminApprove, adminAssets, adminGenerate, adminUpload, spend, usageSummary } from './admin'
import { wavTone } from './audio'
import { sttCostUsd, TTS_MODEL, TTS_VOICE_ID } from './capabilities'
import { fakeProvider } from './fake'
import { pickProvider } from './providers.config'
import { countUsage, deleteUsageWithStatus, insertUsage, voiceTableColumns } from './repository'
import * as service from './service'
import { capabilities, clip, transcribe } from './voice'

const MP3 = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(61, 7)])
let live: ContentDoc
let KEY: string

interface Call {
  url: string
  init: RequestInit
}

function stubFetch(respond: (c: Call) => Response) {
  const calls: Call[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const c = { url: String(url), init }
      calls.push(c)
      return respond(c)
    }),
  )
  return calls
}

const ttsOk = () => stubFetch(() => new Response(new Uint8Array(MP3), { status: 200, headers: { 'content-type': 'audio/mpeg' } }))

// The live document with this key's text in `lang` replaced by a unique string.
function docWith(lang: string, text: string, key = KEY): ContentDoc {
  const doc = structuredClone(live)
  doc.texts[key] = { ...doc.texts[key], [lang]: { text, review: 'unchecked' } }
  return doc
}

const unique = (label: string) => `${label} ${randomUUID()}`

beforeAll(async () => {
  live = await service.liveDoc()
  KEY = Object.keys(live.texts).find((k) => live.texts[k]?.en?.text && live.texts[k]?.fi?.text)!
})

afterEach(() => vi.unstubAllGlobals())

describe('voice capabilities', () => {
  it('lists the shipped languages; Somali is cards with unchecked audio', async () => {
    const { languages } = await capabilities()
    expect(languages.map((l) => l.lang)).toEqual(['en', 'fi', 'sv', 'ru', 'et', 'uk', 'ar', 'so', 'fa', 'zh', 'yue', 'vi', 'th', 'bg'])
    expect(languages.find((l) => l.lang === 'so')).toEqual({ lang: 'so', mode: 'cards_with_audio', voiceInput: false, audioOutput: true, generatedAudioReview: 'unchecked' })
    expect(languages.find((l) => l.lang === 'fi')).toMatchObject({ mode: 'full_voice', voiceInput: true, audioOutput: true, generatedAudioReview: 'approved' })
    // Arabic texts are placeholders: voice input stays on, generated audio starts unchecked.
    expect(languages.find((l) => l.lang === 'ar')).toMatchObject({ mode: 'full_voice', voiceInput: true, generatedAudioReview: 'unchecked' })
    // The added languages are placeholders too: full voice, generated audio starts unchecked.
    for (const lang of ['sv', 'ru', 'et', 'uk', 'fa', 'zh', 'yue', 'vi', 'th', 'bg']) {
      expect(languages.find((l) => l.lang === lang), lang).toEqual({ lang, mode: 'full_voice', voiceInput: true, audioOutput: true, generatedAudioReview: 'unchecked' })
    }
  })
})

describe('clip resolution', () => {
  it('generates with the documented request, stores the audio and records usage', async () => {
    const calls = ttsOk()
    const text = unique('Call the health centre')
    const before = await countUsage('tts.resident', 'ok')

    const c = await service.resolveClip(docWith('en', text), KEY, 'en')

    expect(calls).toHaveLength(1)
    expect(calls[0]!.url).toBe(`https://api.elevenlabs.io/v1/text-to-speech/${TTS_VOICE_ID}?output_format=mp3_44100_128`)
    expect(calls[0]!.init.method).toBe('POST')
    expect(Object.keys(calls[0]!.init.headers as Record<string, string>)).toContain('xi-api-key')
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({ text, model_id: TTS_MODEL, language_code: 'en' })
    expect(c).toMatchObject({ source: 'generated', review: 'approved', textHash: service.textHash(text) })
    const blob = await service.getBlob(Number(c.url.split('/').pop()))
    expect(blob?.mime).toBe('audio/mpeg')
    expect(Buffer.compare(blob!.bytes, MP3)).toBe(0)
    expect(await countUsage('tts.resident', 'ok')).toBe(before + 1)
  })

  it('serves a repeated request, and the same text under another key, from storage', async () => {
    const calls = ttsOk()
    const text = unique('Bring your Kela card')
    const doc = docWith('fi', text)
    const otherKey = Object.keys(live.texts).find((k) => k !== KEY)!
    doc.texts[otherKey] = { ...doc.texts[otherKey], fi: { text, review: 'unchecked' } }

    const first = await service.resolveClip(doc, KEY, 'fi')
    const again = await service.resolveClip(doc, KEY, 'fi')
    const other = await service.resolveClip(doc, otherKey, 'fi')

    expect(calls).toHaveLength(1)
    expect(again.url).toBe(first.url)
    expect(other.url).toBe(first.url)
  })

  it('an approved human recording wins over generated audio; an unchecked one does not', async () => {
    ttsOk()
    const doc = docWith('en', unique('Ask for an interpreter'))
    const generated = await service.resolveClip(doc, KEY, 'en')
    const upload = await service.adminUpload(doc, KEY, 'en', wavTone(0.3).toString('base64'), 'audio/wav', 'admin@test')
    expect(upload.review).toBe('unchecked')
    expect((await service.resolveClip(doc, KEY, 'en')).url).toBe(generated.url)

    await service.adminApprove(upload.id, 'admin@test', new Date())
    const served = await service.resolveClip(doc, KEY, 'en')
    expect(served).toMatchObject({ source: 'human', review: 'approved', url: service.blobUrl(upload.blobId) })
  })

  it('a changed text never serves the old audio, human or generated', async () => {
    const calls = ttsOk()
    const oldDoc = docWith('en', unique('Old wording'))
    const oldClip = await service.resolveClip(oldDoc, KEY, 'en')
    const human = await service.adminUpload(oldDoc, KEY, 'en', wavTone(0.3).toString('base64'), 'audio/wav', 'admin@test')
    await service.adminApprove(human.id, 'admin@test', new Date())

    const newText = unique('New wording')
    const newDoc = docWith('en', newText)
    const newClip = await service.resolveClip(newDoc, KEY, 'en')

    expect(calls).toHaveLength(2)
    expect(newClip).toMatchObject({ source: 'generated', textHash: service.textHash(newText) })
    expect(newClip.url).not.toBe(oldClip.url)
    expect(newClip.url).not.toBe(service.blobUrl(human.blobId))
    const row = (await service.adminAssets(newDoc, 'en')).find((r) => r.key === KEY)!
    expect(row).toMatchObject({ served: 'generated', human: null, textHash: service.textHash(newText) })
    expect(row.staleAssets).toBeGreaterThanOrEqual(2)
  })

  it('does not fall back to English audio and 404s keys without published text', async () => {
    const doc = structuredClone(live)
    doc.texts[KEY] = { en: { text: 'English only', review: 'unchecked' } }
    await expect(service.resolveClip(doc, KEY, 'fi')).rejects.toThrow(/no published fi text/)
    await expect(clip({ key: 'no.such.key', lang: 'en' })).rejects.toThrow(/no published en text/)
  })

  it('generated Somali audio is unchecked and cannot be approved; a human recording can', async () => {
    const calls = ttsOk()
    const doc = docWith('so', unique('Wac xarunta caafimaadka'))
    const c = await service.resolveClip(doc, KEY, 'so')
    expect(JSON.parse(calls[0]!.init.body as string)).toMatchObject({ model_id: 'eleven_v4', language_code: 'so' })
    expect(c.review).toBe('unchecked')
    const row = (await service.adminAssets(doc, 'so')).find((r) => r.key === KEY)!
    await expect(service.adminApprove(row.generated!.id, 'admin@test', new Date())).rejects.toThrow(/cannot be approved/)
  })

  it('generated Arabic audio starts unchecked and an admin may approve it', async () => {
    ttsOk()
    const doc = docWith('ar', unique('اتصل بالمركز الصحي'))
    expect((await service.resolveClip(doc, KEY, 'ar')).review).toBe('unchecked')
    const row = (await service.adminAssets(doc, 'ar')).find((r) => r.key === KEY)!
    const approved = await service.adminApprove(row.generated!.id, 'admin@test', new Date())
    expect(approved).toMatchObject({ review: 'approved', approvedBy: 'admin@test' })
    expect((await service.resolveClip(doc, KEY, 'ar')).review).toBe('approved')
  })

  it('records a provider_error usage row and fails cleanly when ElevenLabs fails', async () => {
    stubFetch(() => Response.json({ detail: [{ loc: ['body', 'text'], msg: 'bad', type: 'value_error' }] }, { status: 422 }))
    const before = await countUsage('tts.resident', 'provider_error')
    await expect(service.resolveClip(docWith('en', unique('Will fail')), KEY, 'en')).rejects.toThrow(/not available/)
    expect(await countUsage('tts.resident', 'provider_error')).toBe(before + 1)
  })
})

describe('speech-to-text', () => {
  it('biases the transcription towards the health care glossary and corrects known mishearings', async () => {
    const calls = stubFetch(() =>
      Response.json({ text: "They were asking for my Kellogg card. I don't know what that is.", language_code: 'eng', words: [], audio_duration_secs: 2 }),
    )

    const out = await transcribe({ lang: 'en', audioBase64: wavTone(2).toString('base64'), mime: 'audio/wav' })

    expect(out.text).toBe("They were asking for my Kela card. I don't know what that is.")
    const keyterms = (calls[0]!.init.body as FormData).getAll('keyterms')
    expect(keyterms).toEqual(expect.arrayContaining(['Kela-kortti', 'Kela card', 'terveysasema']))
    expect(keyterms.length).toBeLessThanOrEqual(100)
  })

  it('adds the 20 % key term surcharge to the cost', () => {
    expect(sttCostUsd(3600, true)).toBeCloseTo(sttCostUsd(3600) * 1.2)
  })

  it('sends the documented multipart request and returns the transcript without storing it', async () => {
    const transcriptText = unique('I have found a new lump')
    const calls = stubFetch(() => Response.json({ text: transcriptText, language_code: 'fin', language_probability: 0.98, words: [], audio_duration_secs: 1.5 }))
    const before = await countUsage('stt.resident', 'ok')

    const out = await transcribe({ lang: 'fi', audioBase64: wavTone(1.5).toString('base64'), mime: 'audio/wav' })

    expect(out).toEqual({ text: transcriptText, lang: 'fi' })
    expect(calls[0]!.url).toBe('https://api.elevenlabs.io/v1/speech-to-text')
    expect(Object.keys(calls[0]!.init.headers as Record<string, string>)).toEqual(['xi-api-key'])
    const form = calls[0]!.init.body as FormData
    expect(form.get('model_id')).toBe('scribe_v3')
    expect(form.get('language_code')).toBe('fi')
    expect((form.get('file') as File).type).toBe('audio/wav')
    expect(await countUsage('stt.resident', 'ok')).toBe(before + 1)
    // No voice table has a column that could hold a transcript or a recording.
    const columns = await voiceTableColumns()
    expect(columns.filter((c) => /transcript|\.text$|recording/.test(c))).toEqual([])
    expect(columns.filter((c) => c.endsWith('.bytes'))).toEqual(['audio_blobs.bytes'])
  })

  it('refuses Somali voice input, unsupported types and oversize audio before any provider call', async () => {
    const calls = stubFetch(() => Response.json({ text: 'x' }))
    const wav = wavTone(0.5).toString('base64')
    await expect(transcribe({ lang: 'so', audioBase64: wav, mime: 'audio/wav' })).rejects.toMatchObject({ code: 'failed_precondition' })
    await expect(transcribe({ lang: 'en', audioBase64: wav, mime: 'video/mp4' })).rejects.toThrow(/unsupported audio type/)
    await expect(transcribe({ lang: 'en', audioBase64: wavTone(31).toString('base64'), mime: 'audio/wav' })).rejects.toThrow(/longer than 30/)
    await expect(transcribe({ lang: 'en', audioBase64: Buffer.alloc(3 * 1024 * 1024).toString('base64'), mime: 'audio/webm' })).rejects.toThrow(/larger than/)
    expect(calls).toHaveLength(0)
  })
})

describe('admin audio endpoints', () => {
  it('reject anonymous calls', async () => {
    await expect(adminAssets({ lang: 'en' })).rejects.toMatchObject({ code: 'unauthenticated' })
    await expect(adminGenerate({ key: KEY, lang: 'en' })).rejects.toMatchObject({ code: 'unauthenticated' })
    await expect(adminUpload({ key: KEY, lang: 'en', audioBase64: '', mime: 'audio/wav' })).rejects.toMatchObject({ code: 'unauthenticated' })
    await expect(adminApprove({ assetId: 1 })).rejects.toMatchObject({ code: 'unauthenticated' })
  })

  it('accept iOS Safari audio/mp4 recordings (ftyp box at offset 4)', async () => {
    ttsOk()
    const doc = docWith('en', unique('Recorded on an iPhone'))
    const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypM4A '), Buffer.alloc(40, 1)])
    const a = await service.adminUpload(doc, KEY, 'en', mp4.toString('base64'), 'audio/mp4', 'admin@test')
    expect(a).toMatchObject({ source: 'human', review: 'unchecked' })
    expect((await service.getBlob(a.blobId))?.mime).toBe('audio/mp4')
    await expect(service.adminUpload(doc, KEY, 'en', Buffer.alloc(48, 1).toString('base64'), 'audio/mp4', 'admin@test')).rejects.toThrow(/not audio\/mp4/)
  })

  it('refuse uploads whose bytes do not match the declared type', async () => {
    await expect(service.adminUpload(live, KEY, 'en', Buffer.from('not audio at all, really').toString('base64'), 'audio/mpeg', 'admin@test')).rejects.toThrow(/not audio\/mpeg/)
  })
})

describe('voice usage', () => {
  it('summarises usage per day, provider and feature without any text', async () => {
    ttsOk()
    const text = unique('Usage row')
    await service.resolveClip(docWith('en', text), KEY, 'en')
    const { rows } = await usageSummary()
    const row = rows.find((r) => r.provider === 'elevenlabs' && r.feature === 'tts.resident')!
    expect(row.characters).toBeGreaterThanOrEqual([...text].length)
    expect(row.costUsd).toBeGreaterThan(0)
    expect(row.day).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect((await spend()).usd).toBeGreaterThan(0)
  })
})

describe('providers', () => {
  it('the fake provider returns a playable WAV and a fixed transcript', async () => {
    const t = await fakeProvider.tts({ text: 'hello', lang: 'en', voiceId: 'x', model: 'y' })
    expect(t.mime).toBe('audio/wav')
    expect(t.bytes.toString('latin1', 0, 4)).toBe('RIFF')
    const s = await fakeProvider.stt({ bytes: wavTone(1), mime: 'audio/wav', lang: 'fi', model: 'z' })
    expect(s).toEqual({ text: 'Löysin rinnastani uuden kyhmyn', lang: 'fi', durationSecs: 1 })
  })

  it('live mode never falls back to fake: at the 5 USD cap new calls are unavailable', () => {
    expect(pickProvider(4.99, 'tts').name).toBe('elevenlabs')
    expect(() => pickProvider(5, 'tts')).toThrow(/voice is temporarily unavailable/)
    expect(() => pickProvider(5.5, 'stt')).toThrow(/voice is temporarily unavailable/)
  })

  it('at the cap stored audio is still served, new generation and speech-to-text are refused', async () => {
    const calls = ttsOk()
    const doc = docWith('en', unique('Stored before the cap'))
    const stored = await service.resolveClip(doc, KEY, 'en')
    expect(calls).toHaveLength(1)
    await insertUsage({ provider: 'test', feature: 'test.cap', model: 'test', characters: 0, seconds: 0, costUsd: 5, status: 'test_cap' })
    try {
      expect((await service.resolveClip(doc, KEY, 'en')).url).toBe(stored.url)
      await expect(service.resolveClip(docWith('en', unique('After the cap')), KEY, 'en')).rejects.toMatchObject({ code: 'unavailable' })
      await expect(transcribe({ lang: 'en', audioBase64: wavTone(1).toString('base64'), mime: 'audio/wav' })).rejects.toThrow(/voice is temporarily unavailable/)
      expect(calls).toHaveLength(1)
    } finally {
      await deleteUsageWithStatus('test_cap')
    }
  })
})

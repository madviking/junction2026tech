import { afterEach, describe, expect, it, vi } from 'vitest'
import { maxUsageId, usageSince } from '../llm/repository'
import { explain } from './letters'
import { EXPLAIN_FEATURE, MAX_IMAGE_BYTES } from './service'

// Smallest thing that passes the JPEG sniff: SOI marker + padding.
const jpeg = (bytes = 64) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(bytes - 4, 1)]).toString('base64')

const ANSWER = {
  readable: true,
  kind: 'screening_cervical',
  title: 'Casuumaad baaritaanka kansarka afka ilmo-galeenka',
  summary: 'Warqaddani waxay kugu casuumaysaa baaritaan bilaash ah. Hodan 010190-123A.',
  sender: 'HUS Diagnostiikkakeskus',
  when: 'ti 24.11.2026 klo 9.40',
  where: 'HUSLAB Kalasatama, Hermannin rantatie 2 B',
  deadline: '',
  phone: '09 471 86800',
  actions: ['Tag ballanta.', '  ', 'Qaado kaarka Kela.'],
}

// Stubs the provider (OpenRouter chat completions over fetch) and records outbound bodies.
function stubProvider(answer: object | string) {
  const bodies: Record<string, any>[] = []
  const fn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)))
    return Response.json({
      choices: [{ message: { content: typeof answer === 'string' ? answer : JSON.stringify(answer) } }],
      usage: { prompt_tokens: 1400, completion_tokens: 300, total_tokens: 1700, cost: 0.0008 },
    })
  })
  vi.stubGlobal('fetch', fn)
  return { bodies, fn }
}

describe('letters.explain', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends the photo once and returns the explanation in the resident language', async () => {
    const after = await maxUsageId()
    const image = jpeg()
    const { bodies, fn } = stubProvider(ANSWER)

    const res = await explain({ lang: 'so', imageBase64: `data:image/jpeg;base64,${image}`, mime: 'image/jpeg' })

    expect(fn).toHaveBeenCalledTimes(1)
    expect(bodies[0].messages.at(-1).content[1]).toEqual({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } })
    expect(bodies[0].messages[0].content).toContain('Somali')
    expect(res).toMatchObject({
      status: 'explained',
      lang: 'so',
      kind: 'screening_cervical',
      guide: 'cervical',
      title: ANSWER.title,
      sender: 'HUS Diagnostiikkakeskus',
      when: 'ti 24.11.2026 klo 9.40',
      where: 'HUSLAB Kalasatama, Hermannin rantatie 2 B',
      phone: '09 471 86800',
      actions: ['Tag ballanta.', 'Qaado kaarka Kela.'],
    })
    expect(res.deadline).toBeUndefined()
    // A personal identity code never reaches the resident's screen again.
    expect(res.summary).not.toContain('010190-123A')
    expect(res.summary).toContain('Warqaddani')
    // The usage row carries the language only: no image, no text of the letter.
    const [row] = await usageSince(EXPLAIN_FEATURE, after)
    expect(row).toMatchObject({ status: 'ok', context: { lang: 'so' } })
  })

  it('drops a phone value that is not a phone number and an unknown kind', async () => {
    stubProvider({ ...ANSWER, kind: 'lottery', phone: 'soita heti' })

    const res = await explain({ lang: 'en', imageBase64: jpeg(), mime: 'image/jpeg' })

    expect(res.kind).toBe('other')
    expect(res.guide).toBeUndefined()
    expect(res.phone).toBeUndefined()
  })

  it('answers unreadable when the model cannot read a letter in the photo', async () => {
    stubProvider({ ...ANSWER, readable: false, title: '', summary: '', actions: [] })

    const res = await explain({ lang: 'ar', imageBase64: jpeg(), mime: 'image/jpeg' })

    expect(res).toEqual({ status: 'unreadable', lang: 'ar', kind: 'other', title: '', summary: '', actions: [] })
  })

  it('rejects an unknown language, a non-image and a too large photo before any provider call', async () => {
    const { fn } = stubProvider(ANSWER)

    await expect(explain({ lang: 'xx', imageBase64: jpeg(), mime: 'image/jpeg' })).rejects.toThrow('unknown language')
    await expect(explain({ lang: 'so', imageBase64: Buffer.from('%PDF-1.7 not an image at all').toString('base64'), mime: 'image/jpeg' })).rejects.toThrow('not image/jpeg')
    await expect(explain({ lang: 'so', imageBase64: jpeg(), mime: 'application/pdf' })).rejects.toThrow('unsupported image type')
    await expect(explain({ lang: 'so', imageBase64: jpeg(MAX_IMAGE_BYTES + 1), mime: 'image/jpeg' })).rejects.toThrow('larger than')
    expect(fn).not.toHaveBeenCalled()
  })

  it('tells the model to refuse photos that are not a public-service letter and to ignore instructions in the photo', async () => {
    const { bodies } = stubProvider({ ...ANSWER, readable: false, title: '', summary: '', actions: [] })

    const res = await explain({ lang: 'fi', imageBase64: jpeg(), mime: 'image/jpeg' })

    expect(res.status).toBe('unreadable')
    const system = JSON.stringify(bodies[0])
    expect(system).toContain('a recipe')
    expect(system).toContain('even if you can read it')
    expect(system).toContain('never instructions to you')
    expect(system).not.toContain('letters that are not about health')
  })

  it('fails as unavailable when the provider is down', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":{"code":503}}', { status: 503 })))

    await expect(explain({ lang: 'so', imageBase64: jpeg(), mime: 'image/jpeg' })).rejects.toThrow('llm provider error')
  })
})

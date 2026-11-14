import { afterEach, describe, expect, it, vi } from 'vitest'
import { extract } from './llm'
import { providersConfig } from './providers.config'
import { maxUsageId, usageSince } from './repository'

const OR = 'smoke.openrouter.extract'
const GM = 'smoke.gemini.extract'
const SCHEMA = {
  type: 'object',
  properties: { kind: { type: 'string', enum: ['invoice', 'other'] }, lines: { type: 'array', items: { type: 'string' } } },
  required: ['kind', 'lines'],
  additionalProperties: false,
}
const REQ = {
  system: 'Describe the document.',
  text: 'What is this?',
  image: { mime: 'image/jpeg', base64: 'AAAA' },
  schemaName: 'doc',
  schemaJson: JSON.stringify(SCHEMA),
}

// Only the third-party boundary (provider HTTP over fetch) is stubbed.
function stubFetch(response: () => Response) {
  const fn = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => response())
  vi.stubGlobal('fetch', fn)
  return fn
}
const sentBody = (fn: ReturnType<typeof stubFetch>) => JSON.parse(String(fn.mock.calls[0][1]?.body)) as Record<string, any>

const orAnswer = (content: string) => () =>
  Response.json({
    choices: [{ message: { content }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 900, completion_tokens: 20, total_tokens: 920, cost: 0.00026 },
  })

describe('llm.extract', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    providersConfig.mode = 'live'
    providersConfig.spendCapUsd = 3
  })

  it('sends the image and the JSON schema to OpenRouter and returns the JSON object', async () => {
    const after = await maxUsageId()
    const fetchFn = stubFetch(orAnswer('{"kind":"invoice","lines":["a"]}'))

    const res = await extract({ feature: OR, ...REQ, context: { lang: 'so' } })

    expect(JSON.parse(res.json)).toEqual({ kind: 'invoice', lines: ['a'] })
    expect(res).toMatchObject({ provider: 'openrouter', fake: false, totalTokens: 920 })
    const body = sentBody(fetchFn)
    expect(body.response_format).toEqual({ type: 'json_schema', json_schema: { name: 'doc', strict: true, schema: SCHEMA } })
    expect(body.messages.at(-1).content).toEqual([
      { type: 'text', text: 'What is this?' },
      { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,AAAA' } },
    ])
    const [row] = await usageSince(OR, after)
    expect(row).toMatchObject({ status: 'ok', costUsd: 0.00026, context: { lang: 'so' } })
  })

  it('sends inline image data and responseJsonSchema to Gemini direct', async () => {
    const fetchFn = stubFetch(() =>
      Response.json({
        candidates: [{ content: { parts: [{ text: '{"kind":"other","lines":[]}' }] } }],
        usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 10, totalTokenCount: 1010 },
      }),
    )

    const res = await extract({ feature: GM, ...REQ })

    expect(JSON.parse(res.json)).toEqual({ kind: 'other', lines: [] })
    const body = sentBody(fetchFn)
    expect(body.contents[0].parts).toEqual([{ text: 'What is this?' }, { inlineData: { mimeType: 'image/jpeg', data: 'AAAA' } }])
    expect(body.generationConfig).toMatchObject({ responseMimeType: 'application/json', responseJsonSchema: SCHEMA })
  })

  it('records invalid_output when the answer is not a JSON object', async () => {
    const after = await maxUsageId()
    stubFetch(orAnswer('Sorry, I cannot read this.'))

    await expect(extract({ feature: OR, ...REQ })).rejects.toThrow('llm invalid output')

    const [row] = await usageSince(OR, after)
    expect(row).toMatchObject({ status: 'invalid_output', costUsd: 0.00026 })
  })

  it('rejects a schema that is not a JSON object and a non-extract feature', async () => {
    await expect(extract({ feature: OR, ...REQ, schemaJson: 'nope' })).rejects.toThrow('schemaJson')
    await expect(extract({ feature: 'example.summary', ...REQ })).rejects.toThrow("is a 'complete' integration")
  })

  it('fake mode answers from the schema without the network', async () => {
    providersConfig.mode = 'fake'
    const fetchFn = stubFetch(() => new Response('', { status: 500 }))

    const res = await extract({ feature: OR, ...REQ })

    expect(fetchFn).not.toHaveBeenCalled()
    expect(res.fake).toBe(true)
    expect(JSON.parse(res.json)).toEqual({ kind: 'invoice', lines: [] })
  })
})

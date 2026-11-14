import { afterEach, describe, expect, it, vi } from 'vitest'
import { decide } from './llm'
import { providersConfig } from './providers.config'
import { maxUsageId, usageSince } from './repository'

const OR = 'smoke.openrouter.decide'
const GM = 'smoke.gemini.decide'
const OPTIONS = [
  { id: 'lump', description: 'A new lump or swelling' },
  { id: 'cough', description: 'A cough for over 3 weeks' },
  { id: 'tired', description: 'Tiredness that does not pass' },
]
const REQ = { input: 'I found a lump in my neck', instructions: 'Pick the card that fits.', options: OPTIONS }

function stubFetch(response: () => Response) {
  const fn = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => response())
  vi.stubGlobal('fetch', fn)
  return fn
}

const orAnswer = (answer: object) => () =>
  Response.json({ answers: { match: answer }, usage: { input_tokens: 60, output_tokens: 3, cost: 0.000006 } })

describe('llm.decide', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    providersConfig.mode = 'live'
    providersConfig.spendCapUsd = 3
  })

  it('returns probabilities highest first and records an ok row with cost', async () => {
    const after = await maxUsageId()
    stubFetch(orAnswer({ type: 'choice', choice: 'lump', probabilities: { cough: 0.15, lump: 0.8, tired: 0.05 }, confidence: 0.8 }))

    const res = await decide({ feature: OR, ...REQ, context: { set: 'symptoms' } })

    expect(res).toMatchObject({ choice: 'lump', confidence: 0.8, provider: 'openrouter', fake: false })
    expect(res.probabilities).toEqual([
      { id: 'lump', p: 0.8 },
      { id: 'cough', p: 0.15 },
      { id: 'tired', p: 0.05 },
    ])
    const rows = await usageSince(OR, after)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ status: 'ok', provider: 'openrouter', promptTokens: 60, totalTokens: 63, costUsd: 0.000006 })
    expect(rows[0].context).toEqual({ set: 'symptoms' })
  })

  it('computes Gemini direct cost from the price table ($0.10 per 1M input)', async () => {
    const after = await maxUsageId()
    stubFetch(() =>
      Response.json({
        answers: { match: { type: 'choice', choice: 'cough', probabilities: { lump: 0.1, cough: 0.85, tired: 0.05 }, confidence: 0.85 } },
        usage: { total_input_tokens: 2000, total_output_tokens: 0, total_tokens: 2000 },
      }),
    )

    const res = await decide({ feature: GM, ...REQ })

    expect(res.provider).toBe('gemini')
    const [row] = await usageSince(GM, after)
    expect(row.costUsd).toBeCloseTo(0.0002, 9)
  })

  it('records a refusal as invalid_output and fails', async () => {
    const after = await maxUsageId()
    stubFetch(orAnswer({ type: 'refusal' }))

    await expect(decide({ feature: OR, ...REQ })).rejects.toThrow('llm invalid output')

    const rows = await usageSince(OR, after)
    expect(rows.map((r) => r.status)).toEqual(['invalid_output'])
    expect(rows[0].costUsd).toBe(0.000006)
  })

  it('records a provider_error row on HTTP failure', async () => {
    const after = await maxUsageId()
    stubFetch(() => new Response('{"error":{"code":503,"message":"down"}}', { status: 503 }))

    await expect(decide({ feature: OR, ...REQ })).rejects.toThrow('llm provider error')

    expect((await usageSince(OR, after)).map((r) => r.status)).toEqual(['provider_error'])
  })

  it('validates options: count, id pattern, duplicates, and feature kind', async () => {
    const fetchFn = stubFetch(orAnswer({}))
    const one = [{ id: 'a', description: 'x' }]
    const many = Array.from({ length: 256 }, (_, i) => ({ id: `o${i}`, description: '' }))
    await expect(decide({ feature: OR, ...REQ, options: one })).rejects.toThrow('2-255 options')
    await expect(decide({ feature: OR, ...REQ, options: many })).rejects.toThrow('2-255 options')
    await expect(decide({ feature: OR, ...REQ, options: [...one, { id: 'b c', description: '' }] })).rejects.toThrow('invalid option id')
    await expect(decide({ feature: OR, ...REQ, options: [...one, { id: 'x'.repeat(65), description: '' }] })).rejects.toThrow('invalid option id')
    await expect(decide({ feature: OR, ...REQ, options: [...one, ...one] })).rejects.toThrow('duplicate option id')
    await expect(decide({ feature: 'example.summary', ...REQ })).rejects.toThrow("is a 'complete' integration")
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('uses the deterministic fake in fake mode, without network, and marks it', async () => {
    providersConfig.mode = 'fake'
    const after = await maxUsageId()
    const fetchFn = stubFetch(orAnswer({}))

    const res = await decide({ feature: OR, ...REQ })

    expect(fetchFn).not.toHaveBeenCalled()
    expect(res).toMatchObject({ choice: 'lump', provider: 'fake', model: 'fake', fake: true })
    const [row] = await usageSince(OR, after)
    expect(row).toMatchObject({ provider: 'fake', status: 'ok', costUsd: 0 })
  })

  it('refuses a live call at or above the spend cap instead of faking it', async () => {
    providersConfig.spendCapUsd = 0
    const after = await maxUsageId()
    const fetchFn = stubFetch(orAnswer({}))

    await expect(decide({ feature: OR, ...REQ })).rejects.toMatchObject({ code: 'unavailable' })

    expect(fetchFn).not.toHaveBeenCalled()
    const rows = await usageSince(OR, after)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ provider: 'openrouter', status: 'provider_error', costUsd: 0, error: 'spend_cap_reached' })
  })

  it('still uses the fake in fake mode when over the cap', async () => {
    providersConfig.spendCapUsd = 0
    providersConfig.mode = 'fake'
    stubFetch(orAnswer({}))
    expect((await decide({ feature: OR, ...REQ })).fake).toBe(true)
  })
})

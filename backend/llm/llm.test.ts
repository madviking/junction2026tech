import { afterEach, describe, expect, it, vi } from 'vitest'
import { complete, spend, usageSummary } from './llm'
import { maxUsageId, usageSince } from './repository'

// Only the third-party boundary (provider HTTP over fetch) is stubbed.
function stubFetch(response: () => Response) {
  const fn = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => response())
  vi.stubGlobal('fetch', fn)
  return fn
}

const openRouterChat = () =>
  Response.json({
    choices: [{ message: { content: 'A short summary.' }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 12, completion_tokens: 5, total_tokens: 17, cost: 0.0000105 },
  })

describe('llm.complete', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('routes an OpenRouter integration to OpenRouter and records cost from usage.cost', async () => {
    const after = await maxUsageId()
    const fetchFn = stubFetch(openRouterChat)

    const result = await complete({ feature: 'example.summary', messages: [{ role: 'user', text: 'Summarise this.' }] })

    expect(String(fetchFn.mock.calls[0][0])).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(result).toMatchObject({ text: 'A short summary.', totalTokens: 17, provider: 'openrouter', fake: false })
    const rows = await usageSince('example.summary', after)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ status: 'ok', provider: 'openrouter', totalTokens: 17, costUsd: 0.0000105 })
  })

  it('routes a Gemini integration to Gemini direct and computes cost from the price table', async () => {
    const after = await maxUsageId()
    const fetchFn = stubFetch(() =>
      Response.json({
        candidates: [{ content: { parts: [{ text: 'ok' }] } }],
        usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 100, totalTokenCount: 1100 },
      }),
    )

    const result = await complete({ feature: 'smoke.gemini.complete', messages: [{ role: 'user', text: 'Say ok.' }] })

    expect(String(fetchFn.mock.calls[0][0])).toMatch(/^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\//)
    expect(result.provider).toBe('gemini')
    const [row] = await usageSince('smoke.gemini.complete', after)
    // 1000 * 0.25/1M + 100 * 1.5/1M
    expect(row.costUsd).toBeCloseTo(0.0004, 9)
  })

  it('records a provider_error row and fails when the provider fails', async () => {
    const after = await maxUsageId()
    stubFetch(() => new Response('{"error":{"code":429,"message":"quota"}}', { status: 429 }))

    await expect(
      complete({ feature: 'example.summary', messages: [{ role: 'user', text: 'Summarise this.' }] }),
    ).rejects.toThrow('llm provider error')

    const rows = await usageSince('example.summary', after)
    expect(rows.map((r) => r.status)).toEqual(['provider_error'])
    expect(rows[0].error).toContain('openrouter_http_429')
  })

  it('records an invalid_output row for an empty answer', async () => {
    const after = await maxUsageId()
    stubFetch(() =>
      Response.json({ choices: [{ message: { content: '' } }], usage: { prompt_tokens: 3, total_tokens: 3, cost: 0.000001 } }),
    )

    await expect(
      complete({ feature: 'example.summary', messages: [{ role: 'user', text: 'x' }] }),
    ).rejects.toThrow('llm invalid output')

    const [row] = await usageSince('example.summary', after)
    expect(row).toMatchObject({ status: 'invalid_output', promptTokens: 3, costUsd: 0.000001 })
  })

  it('rejects an unknown feature key and a decide feature', async () => {
    await expect(complete({ feature: 'nope', messages: [] })).rejects.toThrow('unknown llm feature')
    await expect(complete({ feature: 'cards.match', messages: [] })).rejects.toThrow("is a 'decide' integration")
  })
})

describe('usage endpoints', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('summarises usage per day, provider and feature and totals spend', async () => {
    stubFetch(openRouterChat)
    await complete({ feature: 'example.summary', messages: [{ role: 'user', text: 'Summarise this.' }] })

    const { rows } = await usageSummary()
    const today = new Date().toISOString().slice(0, 10)
    const row = rows.find((r) => r.day === today && r.feature === 'example.summary' && r.provider === 'openrouter')
    expect(row?.calls).toBeGreaterThanOrEqual(1)
    expect(row?.tokens).toBeGreaterThanOrEqual(17)
    expect(row?.costUsd).toBeGreaterThan(0)
    expect(rows.map((r) => r.day)).toEqual([...rows.map((r) => r.day)].sort().reverse())

    const { usd } = await spend()
    expect(usd).toBeGreaterThanOrEqual(row?.costUsd ?? 0)
  })
})

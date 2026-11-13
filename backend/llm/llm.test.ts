import { afterEach, describe, expect, it, vi } from 'vitest'
import { complete } from './llm'
import { countUsage } from './repository'

const FEATURE = 'example.summary'

// Only the third-party boundary (Gemini over fetch) is stubbed.
function stubGemini(response: Response) {
  vi.stubGlobal('fetch', vi.fn(async () => response))
}

describe('llm.complete', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns the text and records an ok usage row', async () => {
    const before = await countUsage(FEATURE, 'ok')
    stubGemini(
      Response.json({
        candidates: [{ content: { parts: [{ text: 'A short summary.' }] } }],
        usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 5, totalTokenCount: 17 },
      }),
    )

    const result = await complete({ feature: FEATURE, messages: [{ role: 'user', text: 'Summarise this.' }] })

    expect(result.text).toBe('A short summary.')
    expect(result.totalTokens).toBe(17)
    expect(await countUsage(FEATURE, 'ok')).toBe(before + 1)
  })

  it('records a provider_error row and fails when Gemini fails', async () => {
    const before = await countUsage(FEATURE, 'provider_error')
    stubGemini(new Response('quota', { status: 429 }))

    await expect(
      complete({ feature: FEATURE, messages: [{ role: 'user', text: 'Summarise this.' }] }),
    ).rejects.toThrow('llm provider error')

    expect(await countUsage(FEATURE, 'provider_error')).toBe(before + 1)
  })

  it('rejects an unknown feature key', async () => {
    await expect(complete({ feature: 'nope', messages: [] })).rejects.toThrow('unknown llm feature')
  })
})

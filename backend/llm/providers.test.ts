// Request shapes of the provider adapters (fetch stubbed; no network).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { gemini } from './gemini'
import { openrouter } from './openrouter'

interface Captured {
  url: string
  headers: Record<string, string>
  body: Record<string, unknown>
}

function capture(response: () => Response): Captured[] {
  const calls: Captured[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({
        url: String(url),
        headers: init?.headers as Record<string, string>,
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      })
      expect(init?.signal).toBeInstanceOf(AbortSignal)
      return response()
    }),
  )
  return calls
}

const OPTIONS = [
  { id: 'lump', description: 'A new lump' },
  { id: 'cough', description: 'A long cough' },
]
const DECIDE = { model: 'm-decide', input: 'I found a lump', instructions: 'Pick the card.', options: OPTIONS }
const decisionAnswer = { type: 'choice', choice: 'lump', probabilities: { lump: 0.9, cough: 0.1 }, confidence: 0.9 }

describe('OpenRouter adapter', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends chat completions with a Bearer key, system first and model -> assistant', async () => {
    const calls = capture(() =>
      Response.json({ choices: [{ message: { content: 'hi' } }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2, cost: 0.1 } }),
    )
    const out = await openrouter.complete({
      model: 'm-chat',
      system: 'Be brief.',
      messages: [
        { role: 'user', text: 'a' },
        { role: 'model', text: 'b' },
      ],
      temperature: 0.2,
      maxOutputTokens: 50,
    })

    expect(calls[0].url).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(calls[0].headers.authorization).toMatch(/^Bearer \S+/)
    expect(calls[0].headers['x-goog-api-key']).toBeUndefined()
    expect(calls[0].body).toEqual({
      model: 'm-chat',
      messages: [
        { role: 'system', content: 'Be brief.' },
        { role: 'user', content: 'a' },
        { role: 'assistant', content: 'b' },
      ],
      temperature: 0.2,
      max_tokens: 50,
    })
    expect(out).toMatchObject({ text: 'hi', totalTokens: 2, costUsd: 0.1 })
  })

  it('sends Decisions to /api/alpha/decisions with the content in `state`', async () => {
    const calls = capture(() =>
      Response.json({ answers: { match: decisionAnswer }, usage: { input_tokens: 40, output_tokens: 2, cost: 0.000004 } }),
    )
    const out = await openrouter.decide(DECIDE)

    expect(calls[0].url).toBe('https://openrouter.ai/api/alpha/decisions')
    expect(calls[0].headers.authorization).toMatch(/^Bearer \S+/)
    expect(calls[0].body).toEqual({
      model: 'm-decide',
      state: 'I found a lump',
      questions: {
        match: { type: 'choice', instructions: 'Pick the card.', criteria: { lump: 'A new lump', cough: 'A long cough' } },
      },
    })
    expect(calls[0].body.input).toBeUndefined()
    expect(out).toMatchObject({ choice: 'lump', confidence: 0.9, promptTokens: 40, totalTokens: 42, costUsd: 0.000004 })
  })

  it('treats a refusal answer as invalid output and keeps its usage', async () => {
    capture(() => Response.json({ answers: { match: { type: 'refusal' } }, usage: { input_tokens: 40, output_tokens: 0, cost: 0.000004 } }))
    await expect(openrouter.decide(DECIDE)).rejects.toMatchObject({
      name: 'InvalidOutputError',
      usage: { promptTokens: 40, costUsd: 0.000004 },
    })
  })

  it('treats a choice outside the options as invalid output', async () => {
    capture(() => Response.json({ answers: { match: { ...decisionAnswer, choice: 'emergency' } }, usage: { input_tokens: 1, output_tokens: 0 } }))
    await expect(openrouter.decide(DECIDE)).rejects.toMatchObject({ name: 'InvalidOutputError' })
  })

  it('raises a ProviderError on HTTP errors', async () => {
    capture(() => new Response('{"error":{"code":404,"message":"no"}}', { status: 404 }))
    await expect(openrouter.decide(DECIDE)).rejects.toMatchObject({ name: 'ProviderError' })
  })
})

describe('Gemini adapter', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends generateContent with x-goog-api-key and systemInstruction', async () => {
    const calls = capture(() =>
      Response.json({
        candidates: [{ content: { parts: [{ text: 'hi' }] } }],
        usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 1, totalTokenCount: 4 },
      }),
    )
    const out = await gemini.complete({ model: 'm-chat', system: 'Be brief.', messages: [{ role: 'user', text: 'a' }], temperature: 0, maxOutputTokens: 9 })

    expect(calls[0].url).toBe('https://generativelanguage.googleapis.com/v1beta/models/m-chat:generateContent')
    expect(calls[0].headers['x-goog-api-key']).toMatch(/\S+/)
    expect(calls[0].headers.authorization).toBeUndefined()
    expect(calls[0].body).toEqual({
      systemInstruction: { parts: [{ text: 'Be brief.' }] },
      contents: [{ role: 'user', parts: [{ text: 'a' }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 9 },
    })
    expect(out).toMatchObject({ text: 'hi', promptTokens: 3, completionTokens: 1, totalTokens: 4 })
    expect(out.costUsd).toBeUndefined()
  })

  it('sends Decisions to /v1beta/decisions with the content in `input`', async () => {
    const calls = capture(() =>
      Response.json({ answers: { match: decisionAnswer }, usage: { total_input_tokens: 50, total_output_tokens: 0, total_tokens: 50 } }),
    )
    const out = await gemini.decide(DECIDE)

    expect(calls[0].url).toBe('https://generativelanguage.googleapis.com/v1beta/decisions')
    expect(calls[0].headers['x-goog-api-key']).toMatch(/\S+/)
    expect(calls[0].body).toEqual({
      model: 'm-decide',
      input: 'I found a lump',
      questions: {
        match: { type: 'choice', instructions: 'Pick the card.', criteria: { lump: 'A new lump', cough: 'A long cough' } },
      },
    })
    expect(calls[0].body.state).toBeUndefined()
    expect(out).toMatchObject({ choice: 'lump', probabilities: { lump: 0.9, cough: 0.1 }, promptTokens: 50, totalTokens: 50 })
  })

  it('treats a safety block (HTTP 400, code safety) as invalid output', async () => {
    capture(() => Response.json({ error: { code: 'safety', message: 'blocked' } }, { status: 400 }))
    await expect(gemini.decide(DECIDE)).rejects.toMatchObject({ name: 'InvalidOutputError' })
  })

  it('treats other HTTP 400s as provider errors', async () => {
    capture(() => Response.json({ error: { code: 400, message: 'bad key' } }, { status: 400 }))
    await expect(gemini.decide(DECIDE)).rejects.toMatchObject({ name: 'ProviderError' })
  })
})

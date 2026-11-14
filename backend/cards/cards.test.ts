import { afterEach, describe, expect, it, vi } from 'vitest'
import { content } from '~encore/clients'
import type { ContentDoc } from '../care_paths/domain/types'
import { providersConfig } from '../llm/providers.config'
import { match } from './cards'
import { decideStatus } from './service'

interface DecisionBody {
  state?: string
  input?: string
  questions: { match: { instructions: string; criteria: Record<string, string> } }
}

// Stubs the provider (OpenRouter Decisions over fetch) and records outbound bodies.
// `probs` picks probabilities for the options it receives.
function stubDecisions(probs: (ids: string[]) => Record<string, number>) {
  const bodies: DecisionBody[] = []
  const fn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as DecisionBody
    bodies.push(body)
    const p = probs(Object.keys(body.questions.match.criteria))
    const choice = Object.entries(p).sort((a, b) => b[1] - a[1])[0][0]
    return Response.json({
      answers: { match: { type: 'choice', choice, probabilities: p, confidence: p[choice] } },
      usage: { input_tokens: 300, output_tokens: 1, cost: 0.00003 },
    })
  })
  vi.stubGlobal('fetch', fn)
  return { bodies, fn }
}

// Puts `top` first with probability a, the next option with b, the rest share what is left.
const favour = (top: string, a: number, b: number) => (ids: string[]) => {
  const rest = ids.filter((i) => i !== top)
  const share = (1 - a - b) / Math.max(rest.length - 1, 1)
  return Object.fromEntries([[top, a], ...rest.map((id, i) => [id, i === 0 ? b : share])])
}

async function doc(): Promise<ContentDoc> {
  return JSON.parse((await content.liveDoc()).docJson) as ContentDoc
}

describe('POST /api/cards/match', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('offers the symptom cards from the live content, with English and Finnish text', async () => {
    const d = await doc()
    const { bodies } = stubDecisions(favour('lump', 0.9, 0.05))

    const res = await match({ lang: 'fi', text: 'Löysin kyhmyn kaulasta', set: 'symptoms' })

    const criteria = bodies[0].questions.match.criteria
    expect(Object.keys(criteria)).toEqual(d.cards.symptoms.map((c) => c.id))
    expect(criteria.lump).toContain(d.texts['card.symptom.lump.card'].en.text)
    expect(criteria.lump).toContain(d.texts['card.symptom.lump.card'].fi.text)
    expect(bodies[0].state).toBe('Löysin kyhmyn kaulasta')
    expect(res.status).toBe('confirm')
    expect(res.top).toEqual({ id: 'lump', text: d.texts['card.symptom.lump.card'].fi.text, probability: 0.9 })
    expect(res.ranked).toHaveLength(d.cards.symptoms.length)
    expect(res.ranked[0].id).toBe('lump')
  })

  it('offers route cards and the outcomes of the given stage', async () => {
    const d = await doc()
    const { bodies } = stubDecisions(favour('A3', 0.8, 0.1))
    await match({ lang: 'en', text: 'I study at the university', set: 'route' })
    expect(Object.keys(bodies[0].questions.match.criteria)).toEqual(Object.keys(d.structure.routes))

    vi.unstubAllGlobals()
    const outcomes = stubDecisions(favour('no_answer', 0.8, 0.1))
    const res = await match({ lang: 'en', text: 'Nobody picked up the phone', set: 'outcomes', stage: 'contact' })
    expect(Object.keys(outcomes.bodies[0].questions.match.criteria)).toEqual(
      Object.keys(d.structure.journey.stages.contact.outcomes),
    )
    expect(res.top?.id).toBe('no_answer')
  })

  it('never offers interrupts in any set', async () => {
    const d = await doc()
    const { bodies } = stubDecisions((ids) => Object.fromEntries(ids.map((id) => [id, 1 / ids.length])))
    await match({ lang: 'en', text: 'I feel bad', set: 'symptoms' })
    await match({ lang: 'en', text: 'I feel bad', set: 'route' })
    for (const stage of Object.keys(d.structure.journey.stages)) {
      if (Object.keys(d.structure.journey.stages[stage].outcomes).length >= 2) {
        await match({ lang: 'en', text: 'I feel bad', set: 'outcomes', stage })
      }
    }
    const interruptIds = Object.keys(d.structure.journey.interrupts)
    const interruptTexts = interruptIds.map((id) => d.texts[`journey.interrupt.${id}.card`].en.text)
    expect(bodies.length).toBeGreaterThan(3)
    for (const b of bodies) {
      const sent = JSON.stringify(b.questions)
      for (const id of interruptIds) expect(Object.keys(b.questions.match.criteria)).not.toContain(id)
      for (const t of interruptTexts) expect(sent).not.toContain(t)
    }
  })

  it('returns choose with no top below the confidence or margin threshold', async () => {
    stubDecisions(favour('lump', 0.5, 0.1))
    const low = await match({ lang: 'en', text: 'something is wrong', set: 'symptoms' })
    expect(low).toMatchObject({ status: 'choose', top: null })
    expect(low.ranked[0].id).toBe('lump')

    vi.unstubAllGlobals()
    stubDecisions(favour('lump', 0.56, 0.44))
    const close = await match({ lang: 'en', text: 'a lump and bleeding', set: 'symptoms' })
    expect(close).toMatchObject({ status: 'choose', top: null })
  })

  it('applies the thresholds inclusively', () => {
    const r = (a: number, b: number) => [
      { id: 'x', text: 'x', probability: a },
      { id: 'y', text: 'y', probability: b },
    ]
    expect(decideStatus(r(0.75, 0.5), 0.75)).toBe('confirm')
    expect(decideStatus(r(0.75, 0.625), 0.75)).toBe('choose')
    expect(decideStatus(r(0.55, 0.375), 0.55)).toBe('confirm')
    expect(decideStatus(r(0.5, 0.25), 0.5)).toBe('choose')
  })

  it('strips identifiers from the outbound body', async () => {
    const { bodies } = stubDecisions(favour('lump', 0.9, 0.05))
    await match({
      lang: 'en',
      text: 'Code slt-ab12-cd34. Mail me at maija.m@postia.fi or call +358 40 123 4567, id 010190-123A, ref 99887766. I found a lump.',
      set: 'symptoms',
    })
    const sent = JSON.stringify(bodies[0])
    for (const s of ['ab12', 'AB12', '@', 'postia', '4567', '123A', '99887766']) expect(sent).not.toContain(s)
    expect(bodies[0].state).toContain('I found a lump.')
  })

  it('returns choose without a provider call when only identifiers were given', async () => {
    const { fn } = stubDecisions(favour('lump', 0.9, 0.05))
    const res = await match({ lang: 'en', text: 'SLT-AB12-CD34', set: 'symptoms' })
    expect(fn).not.toHaveBeenCalled()
    expect(res.status).toBe('choose')
  })

  it('fails (unavailable) instead of guessing when the live spend cap is reached', async () => {
    const { fn } = stubDecisions(favour('lump', 0.9, 0.05))
    providersConfig.spendCapUsd = 0
    try {
      await expect(match({ lang: 'en', text: 'I found a lump', set: 'symptoms' })).rejects.toMatchObject({ code: 'unavailable' })
    } finally {
      providersConfig.spendCapUsd = 3
    }
    expect(fn).not.toHaveBeenCalled()
  })

  it('rejects an unknown set, stage or language', async () => {
    const { fn } = stubDecisions(favour('lump', 0.9, 0.05))
    const bad = (req: object) => match({ lang: 'en', text: 'a lump', set: 'symptoms', ...req } as Parameters<typeof match>[0])
    await expect(bad({ set: 'interrupts' })).rejects.toMatchObject({ code: 'invalid_argument' })
    await expect(bad({ set: 'outcomes' })).rejects.toMatchObject({ code: 'invalid_argument' })
    await expect(bad({ set: 'outcomes', stage: 'nope' })).rejects.toMatchObject({ code: 'invalid_argument' })
    await expect(bad({ set: 'outcomes', stage: 'emergency' })).rejects.toMatchObject({ code: 'invalid_argument' })
    await expect(bad({ lang: 'xx' })).rejects.toMatchObject({ code: 'invalid_argument' })
    expect(fn).not.toHaveBeenCalled()
  })
})

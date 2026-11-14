// Live smoke: one tiny paid call per provider and kind. Skipped unless
//   LLM_LIVE_SMOKE=1 encore test llm/live.smoke.test.ts
// Estimate: 4 calls, < 300 tokens each, < $0.001 total. Prints each usage row.
import { describe, expect, it } from 'vitest'
import { complete, decide } from './llm'
import { maxUsageId, usageSince } from './repository'

const live = process.env.LLM_LIVE_SMOKE === '1'

async function report(feature: string, after: number) {
  const rows = await usageSince(feature, after)
  for (const r of rows) {
    console.log(
      `[live-smoke] ${feature} provider=${r.provider} model=${r.model} status=${r.status} ` +
        `prompt=${r.promptTokens} completion=${r.completionTokens} total=${r.totalTokens} ` +
        `costUsd=${r.costUsd} latencyMs=${r.latencyMs}${r.error ? ` error=${r.error.slice(0, 300)}` : ''}`,
    )
  }
  return rows
}

const DECIDE = {
  input: 'I have had a cough for a month',
  instructions: 'Which card matches what the person describes?',
  options: [
    { id: 'lump', description: 'A new lump or swelling' },
    { id: 'cough', description: 'A cough for over 3 weeks' },
    { id: 'tired', description: 'Tiredness that does not pass' },
  ],
}

describe.skipIf(!live)('live provider smoke', () => {
  for (const feature of ['smoke.openrouter.complete', 'smoke.gemini.complete']) {
    it(feature, async () => {
      const after = await maxUsageId()
      try {
        const res = await complete({ feature, messages: [{ role: 'user', text: 'Reply with the single word: ok' }] })
        console.log(`[live-smoke] ${feature} text=${JSON.stringify(res.text.slice(0, 40))} fake=${res.fake}`)
        expect(res.fake).toBe(false)
      } finally {
        await report(feature, after)
      }
    }, 90_000)
  }

  for (const feature of ['smoke.openrouter.decide', 'smoke.gemini.decide']) {
    it(feature, async () => {
      const after = await maxUsageId()
      try {
        const res = await decide({ feature, ...DECIDE })
        console.log(`[live-smoke] ${feature} choice=${res.choice} confidence=${res.confidence} probs=${JSON.stringify(res.probabilities)}`)
        expect(res.fake).toBe(false)
        expect(res.choice).toBe('cough')
      } finally {
        await report(feature, after)
      }
    }, 90_000)
  }
})

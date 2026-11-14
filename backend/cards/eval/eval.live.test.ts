// Live eval of cards.match against the labelled set. Skipped unless
//   CARDS_EVAL_LIVE=1 encore test cards/eval/eval.live.test.ts
// Estimate: 40 calls x ~500 input tokens x $0.10/1M = ~$0.002.
// Writes docs/proof/2026-11-14/classifier-eval.md.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { llm } from '~encore/clients'
import { resolve } from '../../llm/integrations'
import { match } from '../cards'
import { matchConfig } from '../config'
import { MATCH_FEATURE, type MatchResponse } from '../service'

interface Item {
  id: string
  lang: string
  set: 'symptoms' | 'route' | 'outcomes'
  stage?: string
  text: string
  expect: string
}

interface Result {
  item: Item
  res: MatchResponse | null
  error?: string
}

const live = process.env.CARDS_EVAL_LIVE === '1'
const HERE = import.meta.dirname
const OUT = path.resolve(HERE, '../../../docs/proof/2026-11-14/classifier-eval.md')

async function usageTotals(): Promise<{ usd: number; calls: number; tokens: number }> {
  const [{ usd }, { rows }] = await Promise.all([llm.spend(), llm.usageSummary()])
  const mine = rows.filter((r) => r.feature === MATCH_FEATURE)
  return {
    usd,
    calls: mine.reduce((a, r) => a + r.calls, 0),
    tokens: mine.reduce((a, r) => a + r.tokens, 0),
  }
}

const pct = (n: number, d: number) => (d === 0 ? 'n/a' : `${((100 * n) / d).toFixed(0)}% (${n}/${d})`)

function verdict(r: Result): string {
  if (!r.res) return 'error'
  if (r.item.expect === 'choose') return r.res.status === 'choose' ? 'ok (choose)' : 'WRONG confirm'
  if (r.res.status === 'choose') return 'fallback (choose)'
  return r.res.top?.id === r.item.expect ? 'ok' : 'WRONG confirm'
}

function render(results: Result[], cost: { usd: number; calls: number; tokens: number }, provider: string): string {
  const cardItems = results.filter((r) => r.item.expect !== 'choose')
  const vague = results.filter((r) => r.item.expect === 'choose')
  const confirms = cardItems.filter((r) => r.res?.status === 'confirm')
  const confirmOk = confirms.filter((r) => r.res?.top?.id === r.item.expect)
  const fallbacks = cardItems.filter((r) => r.res?.status === 'choose')
  const rankedOk = cardItems.filter((r) => r.res?.ranked[0]?.id === r.item.expect)
  const vagueOk = vague.filter((r) => r.res?.status === 'choose')
  const errors = results.filter((r) => !r.res)
  const byLang = (lang: string) => {
    const c = confirms.filter((r) => r.item.lang === lang)
    return pct(c.filter((r) => r.res?.top?.id === r.item.expect).length, c.length)
  }

  const rows = results.map((r) => {
    const top = r.res?.ranked[0]
    const p = top ? top.probability.toFixed(2) : '-'
    const second = r.res?.ranked[1]?.probability.toFixed(2) ?? '-'
    const stage = r.item.stage ? `/${r.item.stage}` : ''
    return `| ${r.item.id} | ${r.item.lang} | ${r.item.set}${stage} | ${r.item.text.replace(/\|/g, '/')} | ${r.item.expect} | ${r.res?.status ?? 'error'} | ${top?.id ?? '-'} ${p} / ${second} | ${verdict(r)}${r.error ? ` ${r.error}` : ''} |`
  })

  return `Status: active
Last reviewed: 2026-11-14

# cards.match classifier eval (2026-11-14)

Live run of \`POST /api/cards/match\` (through \`llm.decide\`, feature \`cards.match\`,
provider \`${provider}\`, model from \`backend/llm/integrations.ts\`) on the labelled set
\`backend/cards/eval/labelled.yaml\` (${results.length} synthetic inputs: ${results.filter((r) => r.item.lang === 'en').length} English,
${results.filter((r) => r.item.lang === 'fi').length} Finnish; ${vague.length} vague inputs expected to fall back to \`choose\`).
Options came from the seeded live content in Encore's test database. Guard rails:
\`minConfidence\` ${matchConfig.minConfidence}, \`minMargin\` ${matchConfig.minMargin} (\`backend/cards/config.ts\`).

Proof level: live provider call from \`encore test\` (\`CARDS_EVAL_LIVE=1 encore test cards/eval/eval.live.test.ts\`).

## Results

| Metric | Value |
| --- | --- |
| Top-1 accuracy when the answer was \`confirm\` | ${pct(confirmOk.length, confirms.length)} |
| Wrong confirms (card items + vague items) | ${results.filter((r) => verdict(r) === 'WRONG confirm').length} |
| Card items answered with \`confirm\` (coverage) | ${pct(confirms.length, cardItems.length)} |
| Card items that fell back to \`choose\` | ${pct(fallbacks.length, cardItems.length)} |
| Raw top-1 (highest probability = expected card, any status) | ${pct(rankedOk.length, cardItems.length)} |
| Vague items correctly answered with \`choose\` | ${pct(vagueOk.length, vague.length)} |
| Confirm accuracy, English / Finnish | ${byLang('en')} / ${byLang('fi')} |
| Errors | ${errors.length} |
| Provider calls (llm_usage rows, cards.match) | ${cost.calls} |
| Tokens | ${cost.tokens} |
| Total cost (sum of llm_usage.cost_usd) | $${cost.usd.toFixed(6)} |

## Per item

| Id | Lang | Set | Input | Expected | Status | Top (p) / second p | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join('\n')}
`
}

describe.skipIf(!live)('cards.match live eval', () => {
  it('runs the labelled set once and writes the proof', async () => {
    const { items } = parse(readFileSync(path.join(HERE, 'labelled.yaml'), 'utf8')) as { items: Item[] }
    const before = await usageTotals()
    const results: Result[] = []
    for (const item of items) {
      try {
        const res = await match({ lang: item.lang, text: item.text, set: item.set, stage: item.stage })
        results.push({ item, res })
      } catch (err) {
        results.push({ item, res: null, error: err instanceof Error ? err.message.slice(0, 120) : 'unknown error' })
      }
    }
    const after = await usageTotals()
    const cost = { usd: after.usd - before.usd, calls: after.calls - before.calls, tokens: after.tokens - before.tokens }

    mkdirSync(path.dirname(OUT), { recursive: true })
    writeFileSync(OUT, render(results, cost, resolve(MATCH_FEATURE)?.provider ?? 'unknown'))
    expect(results.filter((r) => !r.res).length).toBeLessThan(items.length)
  }, 600_000)
})

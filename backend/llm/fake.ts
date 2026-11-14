// Deterministic stand-in for the paid providers: no network, no cost. Used only
// when providersConfig.mode is 'fake' (never automatically). Results are marked
// (provider 'fake' on the usage row, fake: true in responses).
import type { CompleteInput, CompleteOutput, DecideInput, DecideOutput, ProviderAdapter } from './provider'

export const FAKE_MODEL = 'fake'

const words = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length > 2),
  )

async function complete(input: CompleteInput): Promise<CompleteOutput> {
  const last = input.messages.at(-1)?.text ?? ''
  return { text: `[fake] ${last.slice(0, 120)}`, promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0 }
}

// Scores each option by shared words with the input (prefix match of 4 letters, so
// "lumps" meets "lump"), then normalises. Ties go to the first option.
async function decide(input: DecideInput): Promise<DecideOutput> {
  const inputWords = [...words(input.input)]
  const scores = input.options.map((o) => {
    const optWords = [...words(o.description)]
    const hits = inputWords.filter((w) => optWords.some((ow) => ow.slice(0, 4) === w.slice(0, 4))).length
    return 1 + 3 * hits
  })
  const total = scores.reduce((a, b) => a + b, 0)
  const probabilities = Object.fromEntries(input.options.map((o, i) => [o.id, scores[i] / total]))
  let best = 0
  scores.forEach((s, i) => {
    if (s > scores[best]) best = i
  })
  return {
    choice: input.options[best].id,
    probabilities,
    confidence: scores[best] / total,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    costUsd: 0,
  }
}

export const fake: ProviderAdapter = { name: 'fake', complete, decide }

// Per-feature model choices. Call sites pass the feature key, never a model ID.
// Model IDs live only in this file (the policy check enforces it).
//
// Switching a feature between OpenRouter and Gemini direct is one line: change its
// `provider`. The model ID for each provider comes from MODELS.

export type ProviderName = 'openrouter' | 'gemini'
export type IntegrationKind = 'complete' | 'decide'

interface ModelFamily {
  openrouter: string
  gemini: string
  // USD per 1M tokens. Used for Gemini direct, which returns no billed cost;
  // OpenRouter returns `usage.cost` itself.
  inputUsdPer1M: number
  outputUsdPer1M: number
}

const MODELS = {
  // Cheap current chat model (gemini-2.5-flash is deprecated).
  flashLite: {
    openrouter: 'google/gemini-3.1-flash-lite',
    gemini: 'gemini-3.1-flash-lite',
    inputUsdPer1M: 0.25,
    outputUsdPer1M: 1.5,
  },
  // Closed-set classifier (Decisions API). Output tokens are free.
  decision: {
    openrouter: 'google/gemini-decision-1',
    gemini: 'gemini-decision-1',
    inputUsdPer1M: 0.1,
    outputUsdPer1M: 0,
  },
} satisfies Record<string, ModelFamily>

type FamilyName = keyof typeof MODELS

interface IntegrationDef {
  description: string
  provider: ProviderName
  kind: IntegrationKind
  family: FamilyName
  temperature?: number
  maxOutputTokens?: number
}

export interface IntegrationSpec {
  feature: string
  description: string
  provider: ProviderName
  kind: IntegrationKind
  model: string
  temperature?: number
  maxOutputTokens?: number
  inputUsdPer1M: number
  outputUsdPer1M: number
}

const INTEGRATIONS: Record<string, IntegrationDef> = {
  // Copy this entry for every new LLM feature. Key = llm_usage.feature.
  'example.summary': {
    description:
      'Reference integration for tests. Input: a short text. Output: a one-sentence ' +
      'summary. A bad answer only costs a failed smoke test.',
    provider: 'openrouter',
    kind: 'complete',
    family: 'flashLite',
    temperature: 0.2,
    maxOutputTokens: 200,
  },
  'cards.match': {
    description:
      'Matches what a resident typed or said to one card of a closed set from the live ' +
      'content (symptom, route or journey outcome cards), or to a health care glossary ' +
      'answer card, or to "none of these". Never sees interrupts or lanes. ' +
      'A bad answer costs one confirmation tap: the UI reads the card back or shows all cards.',
    provider: 'openrouter',
    kind: 'decide',
    family: 'decision',
  },

  // Live smoke only (llm/live.smoke.test.ts): one entry per provider and kind.
  'smoke.openrouter.complete': {
    description: 'Live smoke: OpenRouter chat completion with a tiny input.',
    provider: 'openrouter',
    kind: 'complete',
    family: 'flashLite',
    temperature: 0,
    maxOutputTokens: 20,
  },
  'smoke.gemini.complete': {
    description: 'Live smoke: Gemini direct generateContent with a tiny input.',
    provider: 'gemini',
    kind: 'complete',
    family: 'flashLite',
    temperature: 0,
    maxOutputTokens: 20,
  },
  'smoke.openrouter.decide': {
    description: 'Live smoke: OpenRouter Decisions with a tiny input.',
    provider: 'openrouter',
    kind: 'decide',
    family: 'decision',
  },
  'smoke.gemini.decide': {
    description: 'Live smoke: Gemini direct Decisions with a tiny input.',
    provider: 'gemini',
    kind: 'decide',
    family: 'decision',
  },
}

export function resolve(feature: string): IntegrationSpec | undefined {
  const def = INTEGRATIONS[feature]
  if (!def) return undefined
  const family: ModelFamily = MODELS[def.family]
  return {
    feature,
    description: def.description,
    provider: def.provider,
    kind: def.kind,
    model: family[def.provider],
    temperature: def.temperature,
    maxOutputTokens: def.maxOutputTokens,
    inputUsdPer1M: family.inputUsdPer1M,
    outputUsdPer1M: family.outputUsdPer1M,
  }
}

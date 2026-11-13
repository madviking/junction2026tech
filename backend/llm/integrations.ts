// Per-feature model choices. Call sites pass the feature key, never a model ID.
export interface IntegrationSpec {
  description: string
  model: string
  temperature?: number
  maxOutputTokens?: number
}

const INTEGRATIONS: Record<string, IntegrationSpec> = {
  // Copy this entry for every new LLM feature. Key = llm_usage.feature.
  'example.summary': {
    description:
      'Reference integration for the smoke call and tests. Input: a short text. ' +
      'Output: a one-sentence summary. A bad answer only costs a failed smoke test.',
    model: 'gemini-2.5-flash',
    temperature: 0.2,
    maxOutputTokens: 200,
  },
}

export function resolve(feature: string): IntegrationSpec | undefined {
  return INTEGRATIONS[feature]
}

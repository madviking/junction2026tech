// Provider switches. The orchestrator flips `mode` to 'fake' at the spend cut-off.
// In live mode, once recorded spend (sum of llm_usage.cost_usd) reaches
// `spendCapUsd`, paid calls are refused (APIError.unavailable), never faked.
export type ProviderMode = 'live' | 'fake'

export const providersConfig: { mode: ProviderMode; spendCapUsd: number } = {
  mode: 'live',
  spendCapUsd: 3.0,
}

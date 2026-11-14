import { api } from 'encore.dev/api'
import * as service from './service'
import * as usage from './usage'

// Internal only: other services call these through ~encore/clients, never a provider directly.
export const complete = api(
  { expose: false, method: 'POST', path: '/llm/complete' },
  (req: service.CompleteRequest): Promise<service.CompleteResponse> => service.complete(req),
)

// Closed-set classification (Decisions API): picks one of 2-255 options.
export const decide = api(
  { expose: false, method: 'POST', path: '/llm/decide' },
  (req: service.DecideRequest): Promise<service.DecideResponse> => service.decide(req),
)

// For the admin usage page: last 30 days per day, provider and feature, newest first.
export const usageSummary = api(
  { expose: false, method: 'GET', path: '/internal/llm/usage-summary' },
  (): Promise<usage.UsageSummary> => usage.summary(),
)

// Total recorded LLM spend in USD (all time).
export const spend = api(
  { expose: false, method: 'GET', path: '/internal/llm/spend' },
  (): Promise<usage.Spend> => usage.spend(),
)

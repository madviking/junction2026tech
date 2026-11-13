import { APIError } from 'encore.dev/api'
import log from 'encore.dev/log'
import { generate, type Message } from './gemini'
import { resolve } from './integrations'
import { insertUsage } from './repository'

const PROVIDER = 'gemini'

export interface CompleteRequest {
  // Integration key from integrations.ts, e.g. "example.summary".
  feature: string
  messages: Message[]
  system?: string
  // Stored on the llm_usage row (ids that help trace a call; no personal data).
  context?: Record<string, string>
}

export interface CompleteResponse {
  text: string
  model: string
  totalTokens?: number
  latencyMs: number
}

// One provider attempt; always writes one llm_usage row, also on failure.
export async function complete(req: CompleteRequest): Promise<CompleteResponse> {
  const spec = resolve(req.feature)
  if (!spec) throw APIError.invalidArgument(`unknown llm feature: ${req.feature}`)

  const usage = { feature: req.feature, provider: PROVIDER, model: spec.model, context: req.context ?? {} }
  const started = performance.now()
  const latencyMs = () => Math.round(performance.now() - started)

  try {
    const result = await generate(spec, req.messages, req.system)
    await insertUsage({ ...usage, ...result, status: 'ok', latencyMs: latencyMs() })
    return { text: result.text, model: spec.model, totalTokens: result.totalTokens, latencyMs: latencyMs() }
  } catch (err) {
    const error = err instanceof Error ? `${err.name}: ${err.message}` : 'UnknownError'
    log.warn('llm attempt failed', { feature: req.feature, model: spec.model, error })
    await insertUsage({ ...usage, status: 'provider_error', latencyMs: latencyMs(), error: error.slice(0, 2000) })
    throw APIError.unavailable(`llm provider error for ${req.feature}`)
  }
}

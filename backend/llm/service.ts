// Rules for llm.complete, llm.decide and llm.extract: feature lookup, provider selection (live,
// fake, spend cap), one llm_usage row per attempt with cost.
import { APIError } from 'encore.dev/api'
import log from 'encore.dev/log'
import { fake, FAKE_MODEL } from './fake'
import { gemini } from './gemini'
import { resolve, type IntegrationKind, type IntegrationSpec } from './integrations'
import { openrouter } from './openrouter'
import {
  InvalidOutputError,
  type DecideOption,
  type ImagePart,
  type Message,
  type ProviderAdapter,
  type Usage,
} from './provider'
import { providersConfig } from './providers.config'
import { insertUsage, totalSpendUsd } from './repository'

export type { Message } from './provider'

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
  provider: string
  fake: boolean
  totalTokens?: number
  latencyMs: number
}

export interface DecideRequest {
  feature: string
  // The content to classify (already stripped of identifiers by the caller).
  input: string
  instructions: string
  options: DecideOption[]
  context?: Record<string, string>
}

export interface Probability {
  id: string
  p: number
}

export interface DecideResponse {
  choice: string
  // Highest first.
  probabilities: Probability[]
  confidence: number
  model: string
  provider: string
  fake: boolean
  latencyMs: number
}

export interface ExtractRequest {
  feature: string
  system?: string
  // The instruction for this call. Never logged or stored.
  text: string
  // One image (base64, no data: prefix). Passed through to the provider, never stored.
  image?: ImagePart
  // Name and JSON Schema (as JSON text) of the object the answer must follow.
  schemaName: string
  schemaJson: string
  context?: Record<string, string>
}

export interface ExtractResponse {
  // A JSON object that follows the schema, as JSON text. The caller validates the fields.
  json: string
  model: string
  provider: string
  fake: boolean
  totalTokens?: number
  latencyMs: number
}

const OPTION_ID = /^[A-Za-z0-9_-]{1,64}$/
const ADAPTERS: Record<IntegrationSpec['provider'], ProviderAdapter> = { openrouter, gemini }

function spec(feature: string, kind: IntegrationKind): IntegrationSpec {
  const s = resolve(feature)
  if (!s) throw APIError.invalidArgument(`unknown llm feature: ${feature}`)
  if (s.kind !== kind) throw APIError.invalidArgument(`llm feature ${feature} is a '${s.kind}' integration`)
  return s
}

// Fake adapter in fake mode; otherwise the integration's live adapter. In live mode
// at or above the spend cap the call is refused (never silently faked: a fake
// decision would be read back to a resident as if it were real). The refusal writes
// a provider_error row with cost 0.
export async function selectAdapter(s: IntegrationSpec, context: Record<string, string>): Promise<ProviderAdapter> {
  if (providersConfig.mode === 'fake') return fake
  const spent = await totalSpendUsd()
  if (spent >= providersConfig.spendCapUsd) {
    log.warn('llm spend cap reached; call refused', {
      feature: s.feature,
      spentUsd: spent,
      capUsd: providersConfig.spendCapUsd,
    })
    await insertUsage({
      feature: s.feature,
      provider: s.provider,
      model: s.model,
      status: 'provider_error',
      latencyMs: 0,
      costUsd: 0,
      error: 'spend_cap_reached',
      context,
    })
    throw APIError.unavailable(`llm spend cap reached for ${s.feature}`)
  }
  return ADAPTERS[s.provider]
}

function costOf(adapter: ProviderAdapter, s: IntegrationSpec, u: Usage): number | undefined {
  if (adapter.name === 'fake') return 0
  if (u.costUsd !== undefined) return u.costUsd
  if (u.promptTokens === undefined && u.completionTokens === undefined) return undefined
  return ((u.promptTokens ?? 0) * s.inputUsdPer1M + (u.completionTokens ?? 0) * s.outputUsdPer1M) / 1_000_000
}

// One provider attempt; always writes one llm_usage row, also on failure.
async function attempt<T extends Usage>(
  s: IntegrationSpec,
  context: Record<string, string> | undefined,
  call: (adapter: ProviderAdapter, model: string) => Promise<T>,
): Promise<{ result: T; adapter: ProviderAdapter; model: string; latencyMs: number }> {
  const adapter = await selectAdapter(s, context ?? {})
  const model = adapter.name === 'fake' ? FAKE_MODEL : s.model
  const base = { feature: s.feature, provider: adapter.name, model, context: context ?? {} }
  const started = performance.now()
  const latencyMs = () => Math.round(performance.now() - started)

  try {
    const result = await call(adapter, model)
    const ms = latencyMs()
    await insertUsage({
      ...base,
      status: 'ok',
      latencyMs: ms,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      costUsd: costOf(adapter, s, result),
    })
    return { result, adapter, model, latencyMs: ms }
  } catch (err) {
    const invalid = err instanceof InvalidOutputError
    const error = err instanceof Error ? `${err.name}: ${err.message}` : 'UnknownError'
    const usage = invalid ? err.usage : {}
    log.warn('llm attempt failed', { feature: s.feature, provider: adapter.name, model, error })
    await insertUsage({
      ...base,
      ...usage,
      status: invalid ? 'invalid_output' : 'provider_error',
      latencyMs: latencyMs(),
      costUsd: costOf(adapter, s, usage),
      error: error.slice(0, 2000),
    })
    if (invalid) throw APIError.internal(`llm invalid output for ${s.feature}`)
    throw APIError.unavailable(`llm provider error for ${s.feature}`)
  }
}

export async function complete(req: CompleteRequest): Promise<CompleteResponse> {
  const s = spec(req.feature, 'complete')
  const { result, adapter, model, latencyMs } = await attempt(s, req.context, (a, m) =>
    a.complete({
      model: m,
      messages: req.messages,
      system: req.system,
      temperature: s.temperature,
      maxOutputTokens: s.maxOutputTokens,
    }),
  )
  return {
    text: result.text,
    model,
    provider: adapter.name,
    fake: adapter.name === 'fake',
    totalTokens: result.totalTokens,
    latencyMs,
  }
}

export function validateDecide(req: DecideRequest): void {
  const n = req.options.length
  if (n < 2 || n > 255) throw APIError.invalidArgument(`decide needs 2-255 options, got ${n}`)
  const seen = new Set<string>()
  for (const o of req.options) {
    if (!OPTION_ID.test(o.id)) throw APIError.invalidArgument(`invalid option id: ${o.id.slice(0, 80)}`)
    if (seen.has(o.id)) throw APIError.invalidArgument(`duplicate option id: ${o.id}`)
    seen.add(o.id)
  }
  if (!req.input.trim()) throw APIError.invalidArgument('decide input is empty')
  if (!req.instructions.trim()) throw APIError.invalidArgument('decide instructions are empty')
}

export async function decide(req: DecideRequest): Promise<DecideResponse> {
  const s = spec(req.feature, 'decide')
  validateDecide(req)
  const { result, adapter, model, latencyMs } = await attempt(s, req.context, (a, m) =>
    a.decide({ model: m, input: req.input, instructions: req.instructions, options: req.options }),
  )
  const order = new Map(req.options.map((o, i) => [o.id, i]))
  const probabilities = req.options
    .map((o) => ({ id: o.id, p: result.probabilities[o.id] ?? 0 }))
    .sort((a, b) => b.p - a.p || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  return {
    choice: result.choice,
    probabilities,
    confidence: result.confidence ?? result.probabilities[result.choice] ?? 0,
    model,
    provider: adapter.name,
    fake: adapter.name === 'fake',
    latencyMs,
  }
}

function parseSchema(schemaJson: string): Record<string, unknown> {
  let schema: unknown
  try {
    schema = JSON.parse(schemaJson)
  } catch (err) {
    if (err instanceof SyntaxError) throw APIError.invalidArgument('schemaJson is not JSON')
    throw err
  }
  if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) {
    throw APIError.invalidArgument('schemaJson must be a JSON object')
  }
  return schema as Record<string, unknown>
}

export async function extract(req: ExtractRequest): Promise<ExtractResponse> {
  const s = spec(req.feature, 'extract')
  const schema = parseSchema(req.schemaJson)
  if (!req.text.trim()) throw APIError.invalidArgument('extract text is empty')
  const { result, adapter, model, latencyMs } = await attempt(s, req.context, (a, m) =>
    a.extract({
      model: m,
      system: req.system,
      text: req.text,
      image: req.image,
      schemaName: req.schemaName,
      schema,
      temperature: s.temperature,
      maxOutputTokens: s.maxOutputTokens,
    }),
  )
  return {
    json: result.json,
    model,
    provider: adapter.name,
    fake: adapter.name === 'fake',
    totalTokens: result.totalTokens,
    latencyMs,
  }
}

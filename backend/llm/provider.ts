// Adapter contract shared by openrouter.ts, gemini.ts and fake.ts.

export interface Message {
  role: 'user' | 'model'
  text: string
}

export interface CompleteInput {
  model: string
  messages: Message[]
  system?: string
  temperature?: number
  maxOutputTokens?: number
}

export interface Usage {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  // Billed cost when the provider reports it (OpenRouter); otherwise computed from price.
  costUsd?: number
}

export interface CompleteOutput extends Usage {
  text: string
}

export interface DecideOption {
  id: string
  description: string
}

export interface DecideInput {
  model: string
  input: string
  instructions: string
  options: DecideOption[]
}

export interface DecideOutput extends Usage {
  choice: string
  // option id -> probability, as the provider returned it.
  probabilities: Record<string, number>
  confidence?: number
}

export interface ProviderAdapter {
  name: 'openrouter' | 'gemini' | 'fake'
  complete(input: CompleteInput): Promise<CompleteOutput>
  decide(input: DecideInput): Promise<DecideOutput>
}

// The provider could not be reached or answered with an HTTP error.
export class ProviderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProviderError'
  }
}

// The provider answered, but the answer is unusable (empty, malformed, refusal).
// Usage is attached so the failed attempt's tokens and cost are still recorded.
export class InvalidOutputError extends Error {
  constructor(
    message: string,
    public readonly usage: Usage = {},
  ) {
    super(message)
    this.name = 'InvalidOutputError'
  }
}

// Single question key used in Decisions requests.
export const DECISION_KEY = 'match'

export const TIMEOUT_MS = 60_000

export async function readJson(response: Response, provider: string): Promise<unknown> {
  if (!response.ok) {
    const body = await response.text().catch((err: unknown) => `unreadable body: ${String(err)}`)
    throw new ProviderError(`${provider}_http_${response.status}: ${body.slice(0, 500)}`)
  }
  return response.json()
}

export function validChoice(
  choice: unknown,
  probabilities: unknown,
  options: DecideOption[],
): { choice: string; probabilities: Record<string, number> } | null {
  if (typeof choice !== 'string' || !options.some((o) => o.id === choice)) return null
  if (!probabilities || typeof probabilities !== 'object') return null
  const probs: Record<string, number> = {}
  for (const [k, v] of Object.entries(probabilities as Record<string, unknown>)) {
    if (typeof v === 'number' && options.some((o) => o.id === k)) probs[k] = v
  }
  return { choice, probabilities: probs }
}

// The only file that talks to the Gemini API directly (generateContent + Decisions).
// Gemini returns no billed cost; service.ts computes it from integrations.ts prices.
// API facts: docs/planning/2026-11-14-provider-api-notes.md
import { secret } from 'encore.dev/config'
import {
  DECISION_KEY,
  InvalidOutputError,
  ProviderError,
  TIMEOUT_MS,
  validChoice,
  type CompleteInput,
  type CompleteOutput,
  type DecideInput,
  type DecideOutput,
  type ProviderAdapter,
} from './provider'

const geminiApiKey = secret('GeminiApiKey')

export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

// Input blocked by Gemini safety filters: HTTP 400 with one of these codes. Treated
// like a refusal (invalid_output), not a provider outage.
const SAFETY_CODES = ['safety', 'prohibited_content', 'blocklist', 'image_safety', 'content_blocked']

interface GenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }
}

interface DecisionsResponse {
  answers?: Record<string, { type?: string; choice?: unknown; probabilities?: unknown; confidence?: number }>
  usage?: { total_input_tokens?: number; total_output_tokens?: number; total_tokens?: number }
}

function headers(): Record<string, string> {
  return { 'content-type': 'application/json', 'x-goog-api-key': geminiApiKey() }
}

async function readGemini(response: Response): Promise<unknown> {
  if (response.ok) return response.json()
  const body = await response.text().catch((err: unknown) => `unreadable body: ${String(err)}`)
  if (response.status === 400) {
    const code = safeErrorCode(body)
    if (code && SAFETY_CODES.includes(code)) throw new InvalidOutputError(`gemini_blocked_${code}`)
  }
  throw new ProviderError(`gemini_http_${response.status}: ${body.slice(0, 500)}`)
}

function safeErrorCode(body: string): string | null {
  try {
    const code = (JSON.parse(body) as { error?: { code?: unknown } }).error?.code
    return typeof code === 'string' ? code : null
  } catch (err) {
    if (err instanceof SyntaxError) return null
    throw err
  }
}

async function complete(input: CompleteInput): Promise<CompleteOutput> {
  const response = await fetch(`${GEMINI_BASE_URL}/models/${input.model}:generateContent`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      ...(input.system ? { systemInstruction: { parts: [{ text: input.system }] } } : {}),
      contents: input.messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
      generationConfig: { temperature: input.temperature, maxOutputTokens: input.maxOutputTokens },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const data = (await readGemini(response)) as GenerateContentResponse
  const usage = {
    promptTokens: data.usageMetadata?.promptTokenCount,
    completionTokens: data.usageMetadata?.candidatesTokenCount,
    totalTokens: data.usageMetadata?.totalTokenCount,
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  if (!text) throw new InvalidOutputError('gemini_empty_response', usage)
  return { text, ...usage }
}

async function decide(input: DecideInput): Promise<DecideOutput> {
  const response = await fetch(`${GEMINI_BASE_URL}/decisions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: input.model,
      input: input.input,
      questions: {
        [DECISION_KEY]: {
          type: 'choice',
          instructions: input.instructions,
          criteria: Object.fromEntries(input.options.map((o) => [o.id, o.description])),
        },
      },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const data = (await readGemini(response)) as DecisionsResponse
  const usage = {
    promptTokens: data.usage?.total_input_tokens,
    completionTokens: data.usage?.total_output_tokens,
    totalTokens: data.usage?.total_tokens,
  }
  const answer = data.answers?.[DECISION_KEY]
  if (answer?.type === 'refusal') throw new InvalidOutputError('gemini_refusal', usage)
  const parsed = answer?.type === 'choice' ? validChoice(answer.choice, answer.probabilities, input.options) : null
  if (!parsed) throw new InvalidOutputError('gemini_invalid_decision', usage)
  return { ...parsed, confidence: answer?.confidence, ...usage }
}

export const gemini: ProviderAdapter = { name: 'gemini', complete, decide }

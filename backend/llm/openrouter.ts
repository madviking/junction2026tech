// The only file that talks to OpenRouter (chat completions + alpha Decisions).
// API facts: docs/planning/2026-11-14-provider-api-notes.md
import { secret } from 'encore.dev/config'
import {
  DECISION_KEY,
  InvalidOutputError,
  jsonObjectText,
  readJson,
  TIMEOUT_MS,
  validChoice,
  type CompleteInput,
  type CompleteOutput,
  type DecideInput,
  type DecideOutput,
  type ExtractInput,
  type ExtractOutput,
  type ProviderAdapter,
} from './provider'

const openRouterApiKey = secret('OpenRouterApiKey')

export const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions'
export const OPENROUTER_DECISIONS_URL = 'https://openrouter.ai/api/alpha/decisions'
const TITLE = 'Silta'

interface ChatResponse {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[]
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; cost?: number }
}

interface DecisionsResponse {
  answers?: Record<string, { type?: string; choice?: unknown; probabilities?: unknown; confidence?: number }>
  usage?: { input_tokens?: number; output_tokens?: number; cost?: number }
}

function headers(): Record<string, string> {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${openRouterApiKey()}`,
    'X-OpenRouter-Title': TITLE,
  }
}

async function complete(input: CompleteInput): Promise<CompleteOutput> {
  const messages = [
    ...(input.system ? [{ role: 'system', content: input.system }] : []),
    ...input.messages.map((m) => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text })),
  ]
  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: input.model,
      messages,
      ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
      ...(input.maxOutputTokens !== undefined ? { max_tokens: input.maxOutputTokens } : {}),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const data = (await readJson(response, 'openrouter')) as ChatResponse
  const usage = {
    promptTokens: data.usage?.prompt_tokens,
    completionTokens: data.usage?.completion_tokens,
    totalTokens: data.usage?.total_tokens,
    costUsd: data.usage?.cost,
  }
  const text = data.choices?.[0]?.message?.content ?? ''
  if (!text) throw new InvalidOutputError('openrouter_empty_response', usage)
  return { text, ...usage }
}

async function decide(input: DecideInput): Promise<DecideOutput> {
  const response = await fetch(OPENROUTER_DECISIONS_URL, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: input.model,
      state: input.input,
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
  const data = (await readJson(response, 'openrouter')) as DecisionsResponse
  const inTok = data.usage?.input_tokens
  const outTok = data.usage?.output_tokens
  const usage = {
    promptTokens: inTok,
    completionTokens: outTok,
    totalTokens: inTok !== undefined ? inTok + (outTok ?? 0) : undefined,
    costUsd: data.usage?.cost,
  }
  const answer = data.answers?.[DECISION_KEY]
  if (answer?.type === 'refusal') throw new InvalidOutputError('openrouter_refusal', usage)
  const parsed = answer?.type === 'choice' ? validChoice(answer.choice, answer.probabilities, input.options) : null
  if (!parsed) throw new InvalidOutputError('openrouter_invalid_decision', usage)
  return { ...parsed, confidence: answer?.confidence, ...usage }
}

// Chat completion with an image part and `response_format: json_schema` (strict).
async function extract(input: ExtractInput): Promise<ExtractOutput> {
  const content = [
    { type: 'text', text: input.text },
    ...(input.image
      ? [{ type: 'image_url', image_url: { url: `data:${input.image.mime};base64,${input.image.base64}` } }]
      : []),
  ]
  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: input.model,
      messages: [...(input.system ? [{ role: 'system', content: input.system }] : []), { role: 'user', content }],
      response_format: { type: 'json_schema', json_schema: { name: input.schemaName, strict: true, schema: input.schema } },
      ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
      ...(input.maxOutputTokens !== undefined ? { max_tokens: input.maxOutputTokens } : {}),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const data = (await readJson(response, 'openrouter')) as ChatResponse
  const usage = {
    promptTokens: data.usage?.prompt_tokens,
    completionTokens: data.usage?.completion_tokens,
    totalTokens: data.usage?.total_tokens,
    costUsd: data.usage?.cost,
  }
  const text = data.choices?.[0]?.message?.content ?? ''
  if (!text) throw new InvalidOutputError('openrouter_empty_response', usage)
  return { json: jsonObjectText(text, 'openrouter', usage), ...usage }
}

export const openrouter: ProviderAdapter = { name: 'openrouter', complete, decide, extract }

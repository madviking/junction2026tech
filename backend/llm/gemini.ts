// The only file that talks to the Gemini API.
import { secret } from 'encore.dev/config'
import type { IntegrationSpec } from './integrations'

const geminiApiKey = secret('GeminiApiKey')

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const TIMEOUT_MS = 60_000

export interface Message {
  role: 'user' | 'model'
  text: string
}

export interface ProviderResult {
  text: string
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
}

interface GenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }
}

export async function generate(
  spec: IntegrationSpec,
  messages: Message[],
  system?: string,
): Promise<ProviderResult> {
  const response = await fetch(`${BASE_URL}/models/${spec.model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': geminiApiKey() },
    body: JSON.stringify({
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
      generationConfig: { temperature: spec.temperature, maxOutputTokens: spec.maxOutputTokens },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`gemini_http_${response.status}`)

  const data = (await response.json()) as GenerateContentResponse
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  if (!text) throw new Error('gemini_empty_response')
  return {
    text,
    promptTokens: data.usageMetadata?.promptTokenCount,
    completionTokens: data.usageMetadata?.candidatesTokenCount,
    totalTokens: data.usageMetadata?.totalTokenCount,
  }
}

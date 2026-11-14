Status: active
Last reviewed: 2026-11-14

# Provider API notes (read from the docs on 2026-11-14)

Facts a research agent read from the official docs for the first build. Adapters in
`backend/llm/` and `backend/voice/` follow these. Re-check before changing a call.

## OpenRouter chat completions

- `POST https://openrouter.ai/api/v1/chat/completions`, `Authorization: Bearer <key>`,
  optional `HTTP-Referer`, `X-OpenRouter-Title` (`X-Title` still accepted).
- Body: `model`, `messages`, `temperature`, `max_tokens`, `response_format`
  (`{type:"json_schema", json_schema:{name, strict?, schema}}`).
- Response: `choices[].message.content`, `choices[].finish_reason`;
  `usage.{prompt_tokens, completion_tokens, total_tokens, cost}` always returned
  (`cost` in credits = USD). `usage:{include:true}` is deprecated, no effect.
- Errors: `{ error: { code, message, metadata? } }`.
- Docs: https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion.md

## Gemini Decision 1 (closed-set classifier, launched 2026-11-11)

Not a chat model. Price: $0.10 per 1M input tokens, output free.

Gemini API direct:
- `POST https://generativelanguage.googleapis.com/v1beta/decisions`, header `x-goog-api-key`.
- Body: `model: "gemini-decision-1"`, `input` (string or Content blocks),
  `questions: { <key>: { type: "choice", instructions, criteria: { <option>: <description> } } }`
  (`type` also `noul` yes/no, `score` rubric; keys `[A-Za-z0-9_-]{1,64}`, 2–255 options).
- Response: `answers.<key>.{type, choice, probabilities: {<option>: p}, confidence}`;
  `usage.{total_input_tokens, total_tokens}`. Errors: HTTP 400 `error.{code, message}`.
- Docs: https://aistudio.google.com/docs/decisions-api

OpenRouter (alpha, may change):
- `POST https://openrouter.ai/api/alpha/decisions` (note `/api/alpha`), `Authorization: Bearer`.
- Body: `model: "google/gemini-decision-1"`, content in **`state`** (not `input`), `questions` as above.
- Response: `answers.<key>` as above, plus `type: "refusal"`; `usage.{input_tokens, output_tokens, cost}`.
- Docs: https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request.md

## Gemini generateContent

- `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`,
  `x-goog-api-key`. `contents`, `systemInstruction`, `generationConfig.{maxOutputTokens,
  temperature, responseMimeType, responseJsonSchema}`. `usageMetadata.{promptTokenCount,
  candidatesTokenCount, totalTokenCount}`.
- `gemini-2.5-flash` is deprecated (routed to `gemini-3.5-flash-lite` from 2026-12-01).
  Current: `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`.
- OpenRouter prices per 1M tokens: `google/gemini-2.5-flash-lite` $0.10/$0.40,
  `google/gemini-3.5-flash-lite` $0.30/$2.50.

## ElevenLabs text-to-speech

- `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128`,
  header `xi-api-key`. Body: `text`, `model_id`, `language_code` (ISO 639-1; not for
  multilingual_v2), `voice_settings`. Response: audio bytes. Errors: 422 `{detail:[...]}`.
- Somali needs `eleven_v3` or `eleven_v4` (multilingual_v2 and flash_v2_5 lack Somali).
  Finnish and Arabic: all of v4, v3, multilingual_v2, flash_v2_5.
- Voice ids seen in docs: `JBFqnCBsd6RMkjVDRZzb` (George, quickstart with `eleven_v4`),
  `21m00Tcm4TlvDq8ikWAM` (Rachel). `GET /v1/voices` lists voices.
- Price: v4 / v3 / multilingual v2 $0.08 per 1K characters; flash/turbo $0.04 per 1K.

## ElevenLabs speech-to-text

- `POST https://api.elevenlabs.io/v1/speech-to-text`, multipart, `xi-api-key`.
  Fields: `model_id` (`scribe_v3`; `scribe_v2` previous), `file`, `language_code`.
  Response: `text`, `language_code`, `language_probability`, `words[]`.
- WebM / Opus / OGG accepted (browser MediaRecorder output works).
- Accuracy tiers (Scribe v2): Finnish excellent, Arabic good, Somali moderate (25–50% WER).
- `enable_logging=false` (zero retention) is enterprise-only.
- Price: $0.20 per audio hour (batch).

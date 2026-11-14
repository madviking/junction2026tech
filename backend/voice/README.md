# voice

The only place that calls ElevenLabs. Text-to-speech for card and instruction texts
(stored as `bytea`, served with year-long cache headers), speech-to-text for residents,
human recordings with review, and voice usage/spend.

Provider facts: `docs/planning/2026-11-14-provider-api-notes.md`; ElevenLabs API reference
pages `text-to-speech/convert`, `speech-to-text/convert` and `overview/models`.

## Files

| File | Role |
| --- | --- |
| `capabilities.ts` | Per-language table (voice input, audio output, review of generated audio), model `eleven_v4`, voice, prices |
| `voice.ts` | Public endpoints |
| `admin.ts` | Admin endpoints (`auth: true`, `requireAdmin()`, audited) and internal usage endpoints |
| `service.ts` | Clip resolution, on-demand generation, uploads, approval, usage |
| `stt.ts` | Speech-to-text rules (limits, Somali refusal, no storage) |
| `repository.ts` | SQL |
| `adapter.ts`, `elevenlabs.ts`, `fake.ts`, `providers.config.ts` | Provider interface, real adapter (timeouts 30 s / 60 s), offline adapter (`mode: 'fake'` only), mode + 5 USD spend cap |
| `audio.ts` | Base64 decode with limits, mime sniffing, WAV duration, WAV tone |
| `fixtures/` | Speech-to-text fixtures (WAV, mono, 16 kHz), made with ElevenLabs TTS |

## Languages

| Lang | Mode | Voice input | Audio output | Generated audio review | Generated audio approvable |
| --- | --- | --- | --- | --- | --- |
| en, fi | `full_voice` | yes (Scribe) | yes (`eleven_v4`) | `approved` | yes |
| ar | `full_voice` | yes (Scribe "good") | yes (`eleven_v4`) | `unchecked` (placeholder texts) | yes, by an admin after listening |
| so | `cards_with_audio` | no (Scribe WER 25–50 %) | yes (`eleven_v4`; v2/flash lack Somali) | `unchecked` | no: only an approved human recording |

## Resolution rule

For a text key + lang the service takes the **current published** text
(`content.liveDoc()`, `texts[key][lang]`; no English fallback) and its sha256. It serves an
approved human recording for that hash; otherwise generated audio for that hash, generated
on demand, stored and counted in `voice_usage`. A text change gives a new hash, so older
audio is stale and never served. Generated blobs are unique on
(text_hash, lang, voice_id, model): the same text is never generated twice, also not under
another key. Generated assets from the fake provider are ignored in live mode.

## Endpoints

Public (anonymous):

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/api/voice/capabilities` | – | `Capabilities { languages: LanguageCapability[] }` |
| GET | `/api/voice/clip` | `key`, `lang` | `ClipView { url, source, review, textHash }`; 404 without published text or audio output; 503 `unavailable` when audio must be generated but the spend cap is reached |
| GET (raw) | `/api/voice/blob/:id` | – | audio bytes, `Cache-Control: public, max-age=31536000, immutable`, ETag, 304 on `If-None-Match` |
| POST | `/api/voice/transcribe` | `{ lang, audioBase64, mime }` | `Transcript { text, lang }`; Somali → `failed_precondition`; ≤ 2 MB, WAV ≤ 30 s; at the spend cap → `unavailable` |

Admin (`auth: true`, every write audited as `voice.generate|upload|approve`):

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/api/voice/admin/assets` | `lang` | `{ rows: AdminAssetRow[] }` in content key order: text, hash, current `generated`/`human` `AssetView`, `served`, `staleAssets` |
| POST | `/api/voice/admin/generate` | `{ key, lang }` | `AssetView` (reuses stored audio) |
| POST | `/api/voice/admin/upload` | `{ key, lang, audioBase64, mime }` | `AssetView` (human, `unchecked`; mpeg/webm/ogg/wav/mp4, ≤ 5 MB, bytes must match the type) |
| POST | `/api/voice/admin/approve` | `{ assetId }` | `AssetView` (`approved`); generated Somali audio is refused (`failed_precondition`) |

Internal: `GET /internal/voice/usage-summary` → `{ rows: { day, provider, feature, characters, seconds, costUsd }[] }`,
`GET /internal/voice/spend` → `{ usd }`.

## Tables (migration `5_voice`)

- `audio_blobs` – bytes, mime, text hash, lang, voice, model, source.
- `audio_assets` – text key + lang + hash → blob, source, review, who/when created and approved.
- `voice_usage` – provider, feature (`tts.resident`, `tts.admin`, `stt.resident`), model, characters,
  seconds, cost, status. Never text, audio or transcripts.

## Privacy

Only card/instruction text and the resident's recording reach ElevenLabs. Recordings and
transcripts are not stored or logged (logs carry lengths and status). Zero-retention mode
(`enable_logging=false`) is enterprise-only, so ElevenLabs may keep request logs.

## Cost

TTS characters × $0.08 / 1K (`eleven_v4`), STT seconds × $0.20 / hour (`scribe_v3`). When the
summed `voice_usage.cost_usd` reaches 5.00 USD, live mode refuses new provider calls:
generation and speech-to-text fail with `unavailable` ("voice is temporarily unavailable")
and log a warning. Stored audio is still served. Live mode never falls back to the fake
provider (its fixed transcript would be read as what the resident said). `mode: 'fake'` in
`providers.config.ts` is the explicit offline switch.

Accepted audio: `audio/mpeg`, `audio/webm`, `audio/ogg`, `audio/wav`, `audio/mp4` (iOS Safari
MediaRecorder; checked by the `ftyp` box at byte 4). `codecs=` parameters are ignored.

## Test

```bash
cd backend && encore test voice/     # fetch is stubbed; no paid calls
```

Live proof: `docs/proof/2026-11-14/voice.md`.

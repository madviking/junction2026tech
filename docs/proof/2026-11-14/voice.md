Status: active
Last reviewed: 2026-11-14

# Voice live proof (2026-11-14)

Proof level: **local app** (`encore run` on http://localhost:8300, real ElevenLabs calls,
local Postgres). Unit level: `encore test voice/`, 15 tests pass, fetch stubbed.

Estimate before the run: ~85 TTS characters for clips + ~66 for fixtures at $0.08/1K, plus
~5 s of speech-to-text at $0.20/h ≈ $0.013. Actual spend: **$0.01219** (sum of `voice_usage`).

## 1. One round trip per language (text-to-speech, `eleven_v4`, voice `JBFqnCBsd6RMkjVDRZzb`)

Published card `card.symptom.lump.card` (content version 1), `GET /api/voice/clip` then
`GET /api/voice/blob/:id` over HTTP.

| Lang | Text | Characters | Cost USD | Blob | Bytes | Content type | Length | Review |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| en | A new lump or swelling | 22 | 0.00176 | 1 | 33,061 | audio/mpeg (MP3 128 kbps 44.1 kHz mono) | 2.04 s | approved |
| fi | Uusi kyhmy tai turvotus | 23 | 0.00184 | 2 | 38,077 | audio/mpeg | 2.35 s | approved |
| so | Bar cusub ama bararka | 21 | 0.00168 | 3 | 35,569 | audio/mpeg | 2.19 s | **unchecked** |
| ar | كتلة أو تورم جديد | 17 | 0.00136 | 4 | 39,331 | audio/mpeg | 2.43 s | approved |

- Every blob response had `Cache-Control: public, max-age=31536000, immutable` and an ETag
  (`"<hash16>-<id>"`); `If-None-Match` with it returned 304.
- A repeated `GET /api/voice/clip` (en) returned the same blob and added no usage row
  (served from storage).
- `GET /api/voice/clip?key=no.such&lang=en` → 404.
- Lengths from `afinfo`; nobody listened to the clips in this run, so pronunciation is unverified.
  Somali stays `unchecked` until a human recording is approved.

## 2. Speech-to-text fixtures and live transcription (`scribe_v3`)

Fixtures made with ElevenLabs TTS (`output_format=wav_16000`) by
`backend/voice/fixtures/make_fixtures.mjs` (`encore exec`), PCM 16-bit mono 16 kHz:

| File | Text | Characters | Cost USD | Length |
| --- | --- | --- | --- | --- |
| `backend/voice/fixtures/en-new-lump.wav` | I have found a new lump in my breast | 36 | 0.00288 | 2.48 s |
| `backend/voice/fixtures/fi-new-lump.wav` | Löysin rinnastani uuden kyhmyn | 30 | 0.00240 | 2.40 s |

`POST /api/voice/transcribe` on :8300:

| Lang | Transcript | Seconds | Cost USD |
| --- | --- | --- | --- |
| en | "I have found a new lump in my breast." | 2.48 | 0.000138 |
| fi | "Löysin rinnastani uuden kyhmyn." | 2.40 | 0.000133 |
| so | refused: `failed_precondition` "voice input is not offered in so; use the cards" | – | 0 |

Nothing about the recording or the transcript was stored; the log line carries byte count,
seconds and transcript length only.

## 3. Admin flow over HTTP (local test admin)

- `GET /api/voice/admin/assets?lang=so` without a token → 401; with one: 286 rows, the lump
  card shows `served: generated`, generated review `unchecked`.
- Upload of a human recording → asset `unchecked`, clip still served generated; approve →
  clip served `source: human, review: approved`. Audit log got `voice.upload` and
  `voice.approve`. The English fixture was the stand-in recording, so the asset and blob were
  deleted afterwards. The local Somali card plays the generated clip again.

## Usage rows (local `voice_usage`)

| Feature | Rows | Characters | Seconds | Cost USD |
| --- | --- | --- | --- | --- |
| tts.resident | 4 | 83 | 0 | 0.00664 |
| tts.fixture | 2 | 66 | 0 | 0.00528 |
| stt.resident | 2 | 0 | 4.88 | 0.00027 |

## 9 added languages (14 Nov, later)

Proof level: **local app**, real ElevenLabs calls (`voiceProviderConfig.mode = 'live'`).
Published text `ui.language.title` (machine-translated placeholder, "Choose your language"),
`GET /api/voice/clip?key=ui.language.title&lang=<lang>` then `GET` the blob URL.

| Lang | Blob HTTP | Content type | Bytes | Source | Review |
| --- | --- | --- | --- | --- | --- |
| sv | 200 | audio/mpeg | 26,792 | generated | unchecked |
| ru | 200 | audio/mpeg | 21,358 | generated | unchecked |
| et | 200 | audio/mpeg | 26,792 | generated | unchecked |
| uk | 200 | audio/mpeg | 26,792 | generated | unchecked |
| fa | 200 | audio/mpeg | 33,061 | generated | unchecked |
| zh | 200 | audio/mpeg | 28,046 | generated | unchecked |
| yue | 200 | audio/mpeg | 21,358 | generated | unchecked |
| vi | 200 | audio/mpeg | 24,284 | generated | unchecked |
| th | 200 | audio/mpeg | 25,538 | generated | unchecked |

132 characters in total ≈ $0.011 at $0.08/1K (computed from the texts; `voice_usage` not
re-read). Not checked: pronunciation (nobody has listened), speech-to-text in these languages.

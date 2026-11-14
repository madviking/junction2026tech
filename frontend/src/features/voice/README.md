# voice

Listening and speaking for residents: a listen button for any published text, and a record
button that turns a short spoken answer into text. Backend: `backend/voice/README.md`.

## The rule: voice is an addition

Every screen works fully without audio. A listen button sits next to text that is already
on screen; a record button sits next to cards the resident can tap instead. Both render
**nothing** where the language has no audio output / voice input (Somali has no voice
input), while capabilities load, or when the capabilities request fails. Never make a step
depend on them.

Other features use voice only through `@/features/voice` (`index.ts`).

## Public contract

| Export | Props / signature | Does |
| --- | --- | --- |
| `CardAudioButton` | `{ textKey, label?, lang? }` | Plays the published audio for `textKey` in `lang` (default: the content language, e.g. pass `'fi'` for the Finnish call script). Looks the clip up only on press (`GET /api/voice/clip`, cached under `['voice','clip',lang,textKey]`), then plays `GET /api/voice/blob/:id`. States idle / loading / playing / error (press again to stop or retry). Unchecked audio is not marked to residents; its review status shows in the admin only. |
| `RecordAnswerButton` | `{ onTranscript(text), disabled? }` | Records with MediaRecorder (`audio/webm;codecs=opus` preferred), max 30 s with elapsed time, press again to stop; sends base64 audio to `POST /api/voice/transcribe` with the content language; calls `onTranscript` with the non-empty transcript. Short localised messages for a denied microphone, a failed recording or an empty transcript. |
| `useVoiceCapabilities(lang?)` | → `VoiceCapabilities \| null` | The entry of `GET /api/voice/capabilities` (key `['voice','capabilities']`, cached for the session) for the content language or `lang`; null while loading. |
| `VoiceCapabilities` | type | `voice.LanguageCapability`: `lang`, `mode`, `voiceInput`, `audioOutput`, `generatedAudioReview`. |

All need `<ContentProvider>` (resident routes have it through `WithLanguage`).

## Layout

| Path | Role |
| --- | --- |
| `api/useVoiceCapabilities.ts` | capabilities query |
| `api/useClip.ts` | clip lookup on demand (`fetchQuery`) + cached clip for the label |
| `api/useTranscribe.ts` | transcription mutation (`gcTime: 0`, nothing kept) |
| `api/blobUrl.ts` | clip URL → absolute URL on the API origin (same base as `@/shared/api/api`) |
| `state/player.ts` | one shared `HTMLAudioElement`: a new clip stops the previous one; per-button state via `useSyncExternalStore`; a button that unmounts stops its audio |
| `state/recorder.ts` | MediaRecorder hook: in-memory chunks, 30 s cap, releases the microphone on stop/unmount |
| `components/` | `CardAudioButton`, `RecordAnswerButton` (compose `AudioPlayButton` / `RecordButton` from `@/shared/ui`) |
| `types.ts` | aliases of generated types |

## Privacy

The recording exists only in memory until the transcribe request is sent; nothing goes to
any browser storage, and the transcript is handed to the caller only. The backend does not
store either.

## Strings

`ui.voice.*` in `backend/care_paths/seed/ui/voice.yaml` (en, fi; so/ar unchecked placeholders).

## Tests

- `npx vitest run src/features/voice` — fetch, `HTMLMediaElement.play/pause`, `MediaRecorder`
  and `getUserMedia` stubbed.
- `npx playwright test --project=resident e2e/resident/voice.spec.ts` — real journey and
  backend: a describe-stage card plays (`/api/voice/blob/` 200, audio type); a recorded answer
  (`backend/voice/fixtures/en-new-lump.wav`) is transcribed, matched and read back as the lump
  card. The WAV is played into `getUserMedia` through Web Audio by default, because Chrome's
  fake audio capture hangs on hosts whose terminal app lacks macOS microphone permission;
  `E2E_CHROME_FAKE_MIC=1` uses Chrome's own fake capture instead.

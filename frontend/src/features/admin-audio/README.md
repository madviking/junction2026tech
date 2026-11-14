# admin-audio

Audio per text key and language. Backend: `backend/voice/README.md` (`api.voice.admin*`).

## Page

`AudioPage` (`/admin/audio`): language select (languages with audio output), show filter
(serving human / generated / none, recording waiting for approval, has stale audio) and a
key/text search. Table: text and key, what residents hear (served), human recording status,
generated status, stale count, Listen (AudioPlayButton on the served asset).

Row → SideDrawer: current text, what is served and why (an approved human recording wins over
generated audio; a text change makes older audio stale), human recording (listen, approve,
who/when), upload a recording (FileField `audio/*`, sent as base64 with its MIME type;
uploaded recordings start unchecked), generated audio (listen, Generate text-to-speech when
missing). For languages whose generated audio needs review (Somali) the drawer says so.

## Structure

`api/audio.ts` (queries/mutations, keys `['admin-audio', ...]`), `state/useAudioPreview.ts`
(one audio element, one clip at a time), `components/*`, `lib/files.ts` (base64, MIME,
absolute blob URL), `lib/served.ts`, `types.ts`.

Live provider note: Generate calls ElevenLabs (stored once per text hash, counted in usage).

## Tests

Browser: `e2e/admin/screens.spec.ts`, `e2e/admin/audio-approve.spec.ts`.

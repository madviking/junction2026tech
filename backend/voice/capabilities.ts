// What voice can do per shipped language. Sources: docs/planning/2026-11-14-provider-api-notes.md
// and brain/sources/2026-11-13-elevenlabs-language-coverage.md, checked against
// https://elevenlabs.io/docs/overview/models on 2026-11-14:
// - eleven_v4 speaks en, fi, so and ar (multilingual_v2 and flash_v2_5 lack Somali), so one
//   model and one voice cover every language. $0.08 per 1K characters.
// - Scribe speech-to-text: Finnish and English excellent, Arabic good, Somali moderate
//   (25-50% WER) -> Somali has no voice input; residents use cards.
// - Generated Somali audio stays `unchecked`; only an approved human recording replaces it.
// - Arabic is a placeholder language (texts unchecked), so generated Arabic audio starts
//   `unchecked` too; an admin may approve it after listening.

export type VoiceMode = 'full_voice' | 'cards_with_audio'
export type AudioReview = 'unchecked' | 'approved'

export interface LanguageVoice {
  lang: string
  mode: VoiceMode
  voiceInput: boolean
  audioOutput: boolean
  // Review status a newly generated clip gets in this language.
  generatedAudioReview: AudioReview
  // False when only a human recording can become approved audio (Somali).
  generatedApprovable: boolean
  // ISO 639-1 code sent to the provider (language_code).
  providerLang: string
}

export const TTS_MODEL = 'eleven_v4'
// George, the voice in the ElevenLabs eleven_v4 quickstart (premade, multilingual).
export const TTS_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'
export const TTS_OUTPUT_FORMAT = 'mp3_44100_128'
export const TTS_MIME = 'audio/mpeg'
export const TTS_USD_PER_1K_CHARS = 0.08

export const STT_MODEL = 'scribe_v3'
export const STT_USD_PER_HOUR = 0.2

export const LANGUAGE_VOICE: LanguageVoice[] = [
  { lang: 'en', mode: 'full_voice', voiceInput: true, audioOutput: true, generatedAudioReview: 'approved', generatedApprovable: true, providerLang: 'en' },
  { lang: 'fi', mode: 'full_voice', voiceInput: true, audioOutput: true, generatedAudioReview: 'approved', generatedApprovable: true, providerLang: 'fi' },
  { lang: 'so', mode: 'cards_with_audio', voiceInput: false, audioOutput: true, generatedAudioReview: 'unchecked', generatedApprovable: false, providerLang: 'so' },
  { lang: 'ar', mode: 'full_voice', voiceInput: true, audioOutput: true, generatedAudioReview: 'unchecked', generatedApprovable: true, providerLang: 'ar' },
]

export function languageVoice(lang: string): LanguageVoice | null {
  return LANGUAGE_VOICE.find((l) => l.lang === lang) ?? null
}

export function ttsCostUsd(characters: number): number {
  return (characters / 1000) * TTS_USD_PER_1K_CHARS
}

export function sttCostUsd(seconds: number): number {
  return (seconds / 3600) * STT_USD_PER_HOUR
}

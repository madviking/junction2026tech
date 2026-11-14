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
// - Added 14 Nov (models page + speech-to-text page checked that day): eleven_v4 speaks
//   sv, ru, et, uk, fa, zh, yue, vi and th. Scribe v2 accuracy: sv, ru, et, uk, vi excellent
//   (<=5% WER); fa, zh (Mandarin), yue high (5-10%); th good (10-20%). All get full voice.
//   Their texts are unchecked placeholders, so generated audio starts `unchecked` like Arabic.
// - Bulgarian added 14 Nov (models page: eleven_v4 lists Bulgarian (bg); speech-to-text page:
//   Scribe Bulgarian excellent, <=5% WER). Full voice; placeholder texts, so audio starts `unchecked`.

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
  // Language code sent to the provider (language_code): ISO 639-1, or 639-3 where none exists.
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
  { lang: 'sv', mode: 'full_voice', voiceInput: true, audioOutput: true, generatedAudioReview: 'unchecked', generatedApprovable: true, providerLang: 'sv' },
  { lang: 'ru', mode: 'full_voice', voiceInput: true, audioOutput: true, generatedAudioReview: 'unchecked', generatedApprovable: true, providerLang: 'ru' },
  { lang: 'et', mode: 'full_voice', voiceInput: true, audioOutput: true, generatedAudioReview: 'unchecked', generatedApprovable: true, providerLang: 'et' },
  { lang: 'uk', mode: 'full_voice', voiceInput: true, audioOutput: true, generatedAudioReview: 'unchecked', generatedApprovable: true, providerLang: 'uk' },
  { lang: 'ar', mode: 'full_voice', voiceInput: true, audioOutput: true, generatedAudioReview: 'unchecked', generatedApprovable: true, providerLang: 'ar' },
  { lang: 'so', mode: 'cards_with_audio', voiceInput: false, audioOutput: true, generatedAudioReview: 'unchecked', generatedApprovable: false, providerLang: 'so' },
  { lang: 'fa', mode: 'full_voice', voiceInput: true, audioOutput: true, generatedAudioReview: 'unchecked', generatedApprovable: true, providerLang: 'fa' },
  { lang: 'zh', mode: 'full_voice', voiceInput: true, audioOutput: true, generatedAudioReview: 'unchecked', generatedApprovable: true, providerLang: 'zh' },
  // Cantonese has no ISO 639-1 code; ElevenLabs uses the ISO 639-3 code yue.
  { lang: 'yue', mode: 'full_voice', voiceInput: true, audioOutput: true, generatedAudioReview: 'unchecked', generatedApprovable: true, providerLang: 'yue' },
  { lang: 'vi', mode: 'full_voice', voiceInput: true, audioOutput: true, generatedAudioReview: 'unchecked', generatedApprovable: true, providerLang: 'vi' },
  { lang: 'th', mode: 'full_voice', voiceInput: true, audioOutput: true, generatedAudioReview: 'unchecked', generatedApprovable: true, providerLang: 'th' },
  { lang: 'bg', mode: 'full_voice', voiceInput: true, audioOutput: true, generatedAudioReview: 'unchecked', generatedApprovable: true, providerLang: 'bg' },
]

export function languageVoice(lang: string): LanguageVoice | null {
  return LANGUAGE_VOICE.find((l) => l.lang === lang) ?? null
}

export function ttsCostUsd(characters: number): number {
  return (characters / 1000) * TTS_USD_PER_1K_CHARS
}

// ElevenLabs bills key term biasing as a 20 % surcharge on the transcription.
export const STT_KEYTERM_SURCHARGE = 0.2

export function sttCostUsd(seconds: number, keyterms = false): number {
  return (seconds / 3600) * STT_USD_PER_HOUR * (keyterms ? 1 + STT_KEYTERM_SURCHARGE : 1)
}

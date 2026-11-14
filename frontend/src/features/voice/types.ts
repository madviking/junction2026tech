import type { voice } from '@/shared/api/client'

// Generated contract types under feature-local names (never hand-written shapes).
/** Voice capabilities of one language: voice input, audio output, mode, review of generated audio. */
export type VoiceCapabilities = voice.LanguageCapability
export type VoiceClip = voice.ClipView
export type VoiceTranscript = voice.Transcript

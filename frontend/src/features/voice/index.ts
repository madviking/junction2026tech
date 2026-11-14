// Public index of the voice feature: playback and recording, used by other features.
// A screen must work fully without audio: voice is an addition, never the only way.
export { useVoiceCapabilities } from '@/features/voice/api/useVoiceCapabilities'
export { CardAudioButton, type CardAudioButtonProps } from '@/features/voice/components/CardAudioButton'
export { RecordAnswerButton, type RecordAnswerButtonProps } from '@/features/voice/components/RecordAnswerButton'
export type { VoiceCapabilities } from '@/features/voice/types'

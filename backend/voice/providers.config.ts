// Which voice provider runs. `live` calls ElevenLabs; `fake` (tests, explicit switch) never
// leaves the process. In live mode the spend cap stops new provider calls: generation and
// speech-to-text fail as unavailable (never fake beeps or a canned transcript); stored
// audio is still served.
import { APIError } from 'encore.dev/api'
import log from 'encore.dev/log'
import type { VoiceProvider } from './adapter'
import { TTS_MODEL, TTS_VOICE_ID } from './capabilities'
import { elevenLabs } from './elevenlabs'
import { FAKE_MODEL, FAKE_VOICE_ID, fakeProvider } from './fake'

export type VoiceProviderMode = 'live' | 'fake'

export const voiceProviderConfig: { mode: VoiceProviderMode; spendCapUsd: number } = {
  mode: 'live',
  spendCapUsd: 5.0,
}

// Voice and model that generated audio must have to be served in the current mode.
export function activeEngine(): { voiceId: string; model: string } {
  return voiceProviderConfig.mode === 'fake' ? { voiceId: FAKE_VOICE_ID, model: FAKE_MODEL } : { voiceId: TTS_VOICE_ID, model: TTS_MODEL }
}

export function pickProvider(spentUsd: number, what: 'tts' | 'stt'): VoiceProvider {
  if (voiceProviderConfig.mode === 'fake') return fakeProvider
  if (spentUsd >= voiceProviderConfig.spendCapUsd) {
    log.warn('voice spend cap reached; provider call refused', { what, spentUsd, capUsd: voiceProviderConfig.spendCapUsd })
    throw APIError.unavailable('voice is temporarily unavailable')
  }
  return elevenLabs
}

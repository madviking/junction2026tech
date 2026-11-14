// Offline provider: a short WAV tone for text-to-speech and a fixed transcript per
// language for speech-to-text. Used when providers.config says so or the spend cap is hit.
import type { SttRequest, SttResult, TtsRequest, TtsResult, VoiceProvider } from './adapter'
import { wavDurationSecs, wavTone } from './audio'

export const FAKE_MODEL = 'fake-tone'
export const FAKE_VOICE_ID = 'fake'

export const FAKE_TRANSCRIPTS: Record<string, string> = {
  en: 'I have found a new lump in my breast',
  fi: 'Löysin rinnastani uuden kyhmyn',
  ar: 'وجدت كتلة جديدة في صدري',
}

export const fakeProvider: VoiceProvider = {
  name: 'fake',

  async tts(req: TtsRequest): Promise<TtsResult> {
    // Length grows a little with the text so different clips are distinguishable.
    const seconds = Math.min(2, 0.4 + req.text.length / 200)
    return { bytes: wavTone(seconds), mime: 'audio/wav', model: FAKE_MODEL, voiceId: FAKE_VOICE_ID }
  },

  async stt(req: SttRequest): Promise<SttResult> {
    const durationSecs = req.mime === 'audio/wav' ? wavDurationSecs(req.bytes) : null
    return { text: FAKE_TRANSCRIPTS[req.lang] ?? FAKE_TRANSCRIPTS.en!, lang: req.lang, durationSecs }
  },
}

// Voice provider interface. elevenlabs.ts is the real one, fake.ts works offline.
// Only card/instruction text and the resident's recording are ever sent: no names or ids.

export interface TtsRequest {
  text: string
  // ISO 639-1 code for the provider.
  lang: string
  voiceId: string
  model: string
  // Provider output format; default mp3 (TTS_OUTPUT_FORMAT). wav_16000 for fixtures.
  outputFormat?: string
}

export interface TtsResult {
  bytes: Buffer
  mime: string
  // Model and voice actually used (the fake adapter reports its own).
  model: string
  voiceId: string
}

export interface SttRequest {
  bytes: Buffer
  mime: string
  lang: string
  model: string
}

export interface SttResult {
  text: string
  lang: string
  // Audio length when the provider reports it.
  durationSecs: number | null
}

export interface VoiceProvider {
  name: 'elevenlabs' | 'fake'
  tts(req: TtsRequest): Promise<TtsResult>
  stt(req: SttRequest): Promise<SttResult>
}

export class ProviderError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}

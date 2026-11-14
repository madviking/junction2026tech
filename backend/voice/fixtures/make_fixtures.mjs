// Makes the speech-to-text fixtures with ElevenLabs text-to-speech (WAV, mono, 16 kHz) and
// records the spend in voice_usage. Paid (~$0.005 for both); run only when a fixture changes:
//   cd backend && encore exec -- node voice/fixtures/make_fixtures.mjs
// Same request as elevenlabs.ts (text-to-speech/convert, output_format=wav_16000).
import { writeFileSync } from 'node:fs'
import { secret } from 'encore.dev/config'
import { SQLDatabase } from 'encore.dev/storage/sqldb'

const FIXTURES = [
  { file: 'en-new-lump.wav', lang: 'en', text: 'I have found a new lump in my breast' },
  { file: 'fi-new-lump.wav', lang: 'fi', text: 'Löysin rinnastani uuden kyhmyn' },
]
const VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'
const MODEL = 'eleven_v4'
const USD_PER_1K_CHARS = 0.08

const db = SQLDatabase.named('silta')
const key = secret('ElevenLabsApiKey')()
const dir = new URL('.', import.meta.url)

for (const f of FIXTURES) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=wav_16000`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'xi-api-key': key },
    body: JSON.stringify({ text: f.text, model_id: MODEL, language_code: f.lang }),
    signal: AbortSignal.timeout(30_000),
  })
  const characters = [...f.text].length
  const status = response.ok ? 'ok' : 'provider_error'
  const cost = response.ok ? (characters / 1000) * USD_PER_1K_CHARS : 0
  await db.exec`
    INSERT INTO voice_usage (provider, feature, model, characters, seconds, cost_usd, status)
    VALUES ('elevenlabs', 'tts.fixture', ${MODEL}, ${characters}, 0, ${cost}, ${status})`
  if (!response.ok) throw new Error(`elevenlabs_tts_http_${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  writeFileSync(new URL(f.file, dir), bytes)
  console.log(`${f.file}: ${bytes.length} bytes, ${characters} characters, $${cost.toFixed(4)}`)
}

// Audio helpers without I/O: base64 decoding with limits, mime normalisation and
// sniffing, WAV duration, and a small WAV tone writer for the fake provider.
import { APIError } from 'encore.dev/api'

// audio/mp4: iOS Safari MediaRecorder records AAC in MP4.
export const ACCEPTED_MIMES = ['audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp4'] as const
const ALIASES: Record<string, string> = {
  'audio/mp3': 'audio/mpeg',
  'audio/x-wav': 'audio/wav',
  'audio/wave': 'audio/wav',
  'audio/vnd.wave': 'audio/wav',
  'audio/x-m4a': 'audio/mp4',
  'audio/m4a': 'audio/mp4',
}

// "audio/webm;codecs=opus" -> "audio/webm"; null when not accepted.
export function normaliseMime(mime: string): string | null {
  const base = mime.split(';')[0]!.trim().toLowerCase()
  const m = ALIASES[base] ?? base
  return (ACCEPTED_MIMES as readonly string[]).includes(m) ? m : null
}

// Checks the first bytes match the declared container.
export function looksLike(bytes: Buffer, mime: string): boolean {
  const ascii = (start: number, end: number) => bytes.subarray(start, end).toString('latin1')
  switch (mime) {
    case 'audio/wav':
      return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE'
    case 'audio/ogg':
      return ascii(0, 4) === 'OggS'
    case 'audio/webm':
      return bytes.readUInt32BE(0) === 0x1a45dfa3
    case 'audio/mp4':
      // ISO base media file: the first box is `ftyp`, its type at byte offset 4.
      return ascii(4, 8) === 'ftyp'
    case 'audio/mpeg':
      return ascii(0, 3) === 'ID3' || (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0)
    default:
      return false
  }
}

export function decodeAudio(audioBase64: string, mime: string, maxBytes: number): { bytes: Buffer; mime: string } {
  const m = normaliseMime(mime)
  if (!m) throw APIError.invalidArgument(`unsupported audio type; use one of ${ACCEPTED_MIMES.join(', ')}`)
  const clean = audioBase64.replace(/^data:[^,]*,/, '')
  if (clean.length > Math.ceil((maxBytes * 4) / 3) + 4) throw APIError.resourceExhausted(`audio larger than ${maxBytes} bytes`)
  const bytes = Buffer.from(clean, 'base64')
  if (bytes.length < 16) throw APIError.invalidArgument('audio is empty')
  if (bytes.length > maxBytes) throw APIError.resourceExhausted(`audio larger than ${maxBytes} bytes`)
  if (!looksLike(bytes, m)) throw APIError.invalidArgument(`audio content is not ${m}`)
  return { bytes, mime: m }
}

// Duration of a PCM WAV in seconds (null when the header is not the simple layout).
export function wavDurationSecs(bytes: Buffer): number | null {
  if (bytes.length < 44 || bytes.toString('latin1', 0, 4) !== 'RIFF') return null
  let off = 12
  let byteRate = 0
  while (off + 8 <= bytes.length) {
    const id = bytes.toString('latin1', off, off + 4)
    const size = bytes.readUInt32LE(off + 4)
    if (id === 'fmt ') byteRate = bytes.readUInt32LE(off + 16)
    if (id === 'data') {
      if (!byteRate) return null
      const dataSize = Math.min(size, bytes.length - off - 8)
      return dataSize / byteRate
    }
    off += 8 + size + (size % 2)
  }
  return null
}

// A mono 16-bit PCM WAV sine tone: playable audio without the network.
export function wavTone(seconds: number, hz = 440, sampleRate = 16_000): Buffer {
  const samples = Math.round(seconds * sampleRate)
  const buf = Buffer.alloc(44 + samples * 2)
  buf.write('RIFF', 0, 'latin1')
  buf.writeUInt32LE(36 + samples * 2, 4)
  buf.write('WAVE', 8, 'latin1')
  buf.write('fmt ', 12, 'latin1')
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20) // PCM
  buf.writeUInt16LE(1, 22) // mono
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(sampleRate * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36, 'latin1')
  buf.writeUInt32LE(samples * 2, 40)
  for (let i = 0; i < samples; i++) {
    const fade = Math.min(1, i / 400, (samples - i) / 400)
    buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * hz * i) / sampleRate) * 8000 * fade), 44 + i * 2)
  }
  return buf
}

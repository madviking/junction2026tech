// Photo helpers without I/O: base64 decoding with a size limit, mime normalisation and
// a check that the first bytes are the declared image format.
import { APIError } from 'encore.dev/api'

export const ACCEPTED_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const

function looksLike(bytes: Buffer, mime: string): boolean {
  const ascii = (start: number, end: number) => bytes.subarray(start, end).toString('latin1')
  switch (mime) {
    case 'image/jpeg':
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    case 'image/png':
      return bytes.readUInt32BE(0) === 0x89504e47
    case 'image/webp':
      return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP'
    default:
      return false
  }
}

// Returns clean base64 (no data: prefix) of a real image of an accepted type.
export function decodeImage(imageBase64: string, mime: string, maxBytes: number): { base64: string; mime: string; bytes: number } {
  const m = mime.split(';')[0]!.trim().toLowerCase().replace('image/jpg', 'image/jpeg')
  if (!(ACCEPTED_MIMES as readonly string[]).includes(m)) {
    throw APIError.invalidArgument(`unsupported image type; use one of ${ACCEPTED_MIMES.join(', ')}`)
  }
  const clean = imageBase64.replace(/^data:[^,]*,/, '')
  if (clean.length > Math.ceil((maxBytes * 4) / 3) + 4) throw APIError.resourceExhausted(`photo larger than ${maxBytes} bytes`)
  const bytes = Buffer.from(clean, 'base64')
  if (bytes.length < 16) throw APIError.invalidArgument('photo is empty')
  if (bytes.length > maxBytes) throw APIError.resourceExhausted(`photo larger than ${maxBytes} bytes`)
  if (!looksLike(bytes, m)) throw APIError.invalidArgument(`photo content is not ${m}`)
  return { base64: bytes.toString('base64'), mime: m, bytes: bytes.length }
}

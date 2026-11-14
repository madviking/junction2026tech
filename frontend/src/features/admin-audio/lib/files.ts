const MIME_BY_EXTENSION: Record<string, string> = {
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  mpeg: 'audio/mpeg',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
}

/** The file's MIME type, from the browser or else from its extension. */
export function audioMime(file: File): string {
  if (file.type) return file.type
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  return MIME_BY_EXTENSION[extension] ?? 'application/octet-stream'
}

/** The file's bytes as base64 (without the data: prefix). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'))
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.readAsDataURL(file)
  })
}

/** Absolute URL of an audio blob path such as `/api/voice/blob/1`. */
export function assetUrl(base: string, path: string): string {
  return /^https?:/.test(path) ? path : `${base}${path}`
}

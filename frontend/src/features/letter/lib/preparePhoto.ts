/** What POST /api/letters/explain takes (backend limit: 1.4 MB of image bytes). */
export interface PreparedPhoto {
  imageBase64: string
  mime: string
}

const SENDABLE = ['image/jpeg', 'image/png', 'image/webp']
// A photo this small in a sendable format goes as it is.
const DIRECT_MAX_BYTES = 900_000
const TARGET_MAX_BYTES = 1_300_000
// Longest edge in px and JPEG quality, tried in order until the result fits. A4 text stays
// readable at 1100 px.
const STEPS: [number, number][] = [
  [1800, 0.82],
  [1400, 0.75],
  [1100, 0.7],
]

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''))
    reader.onerror = () => reject(reader.error ?? new Error('could not read the photo'))
    reader.readAsDataURL(blob)
  })
}

function toJpeg(bitmap: ImageBitmap, edge: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas is not available')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('could not encode the photo'))), 'image/jpeg', quality),
  )
}

/**
 * Makes a phone photo small enough to send: scaled down and re-encoded as JPEG in the
 * browser (the photo's rotation is applied). Nothing is stored.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (SENDABLE.includes(file.type) && file.size <= DIRECT_MAX_BYTES) {
    return { imageBase64: await toBase64(file), mime: file.type }
  }
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    let blob: Blob | null = null
    for (const [edge, quality] of STEPS) {
      blob = await toJpeg(bitmap, edge, quality)
      if (blob.size <= TARGET_MAX_BYTES) break
    }
    if (!blob || blob.size > TARGET_MAX_BYTES) throw new Error('the photo is too large')
    return { imageBase64: await toBase64(blob), mime: 'image/jpeg' }
  } finally {
    bitmap.close()
  }
}

// Short microphone recordings held in memory only: never written to any storage.
import { useCallback, useEffect, useRef, useState } from 'react'

export const MAX_RECORDING_SECONDS = 30

// Opus in WebM first (Chrome, Firefox, Edge); the backend accepts webm, ogg, mpeg and wav.
const PREFERRED_MIMES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4']

export type RecorderFailure = 'denied' | 'unsupported' | 'failed'

export interface Recording {
  audioBase64: string
  mime: string
}

export function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return undefined
  return PREFERRED_MIMES.find((m) => MediaRecorder.isTypeSupported(m))
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result)
      resolve(url.slice(url.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error ?? new Error('could not read the recording'))
    reader.readAsDataURL(blob)
  })
}

interface Handlers {
  onRecording: (rec: Recording) => void
  onFailure: (reason: RecorderFailure) => void
}

/**
 * Microphone recording with MediaRecorder: start(), stop() (or automatic stop at 30 s),
 * elapsed seconds while recording. The finished recording goes to `onRecording` as base64.
 */
export function useRecorder({ onRecording, onFailure }: Handlers) {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const handlers = useRef<Handlers>({ onRecording, onFailure })
  useEffect(() => {
    handlers.current = { onRecording, onFailure }
  })

  const release = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const stop = useCallback(() => {
    const rec = recorderRef.current
    if (rec && rec.state !== 'inactive') rec.stop()
  }, [])

  const start = useCallback(async () => {
    if (recorderRef.current) return
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      handlers.current.onFailure('unsupported')
      return
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      handlers.current.onFailure(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'failed')
      return
    }
    streamRef.current = stream
    const mime = pickMime()
    let rec: MediaRecorder
    try {
      rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    } catch (_err) {
      release()
      handlers.current.onFailure('unsupported')
      return
    }
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    rec.onstop = () => {
      release()
      recorderRef.current = null
      setRecording(false)
      const type = (rec.mimeType || mime || 'audio/webm').toLowerCase()
      const blob = new Blob(chunks, { type })
      chunks.length = 0
      if (blob.size === 0) {
        handlers.current.onFailure('failed')
        return
      }
      toBase64(blob).then(
        (audioBase64) => handlers.current.onRecording({ audioBase64, mime: type }),
        () => handlers.current.onFailure('failed'),
      )
    }
    recorderRef.current = rec
    rec.start()
    setElapsed(0)
    setRecording(true)
    const startedAt = Date.now()
    timerRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startedAt) / 1000)
      setElapsed(secs)
      if (secs >= MAX_RECORDING_SECONDS) stop()
    }, 250)
  }, [release, stop])

  // Leaving the screen stops the microphone and drops the recording.
  useEffect(
    () => () => {
      const rec = recorderRef.current
      if (rec) {
        rec.ondataavailable = null
        rec.onstop = null
        if (rec.state !== 'inactive') rec.stop()
      }
      recorderRef.current = null
      release()
    },
    [release],
  )

  return { recording, elapsed, start, stop }
}

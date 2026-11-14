import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioPlayState } from '@/shared/ui'

/** Plays one audio URL at a time for the admin's own listening; owns the audio element. */
export function useAudioPreview() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [current, setCurrent] = useState<{ url: string; state: AudioPlayState } | null>(null)

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.src = ''
    }
    audioRef.current = null
    setCurrent(null)
  }, [])

  useEffect(() => stop, [stop])

  const toggle = useCallback(
    (url: string) => {
      if (current?.url === url && (current.state === 'playing' || current.state === 'loading')) {
        stop()
        return
      }
      audioRef.current?.pause()
      const audio = new Audio(url)
      audioRef.current = audio
      setCurrent({ url, state: 'loading' })
      audio.onplaying = () => setCurrent((c) => (c?.url === url ? { url, state: 'playing' } : c))
      audio.onended = () => setCurrent((c) => (c?.url === url ? null : c))
      audio.onerror = () => setCurrent((c) => (c?.url === url ? { url, state: 'error' } : c))
      audio.play().catch(() => setCurrent((c) => (c?.url === url ? { url, state: 'error' } : c)))
    },
    [current, stop],
  )

  const stateOf = useCallback((url: string): AudioPlayState => (current?.url === url ? current.state : 'idle'), [current])

  return { toggle, stateOf, stop }
}

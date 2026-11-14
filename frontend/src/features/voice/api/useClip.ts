import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import type { VoiceClip } from '@/features/voice/types'
import { api } from '@/shared/api/api'

export const voiceClipQueryKey = (lang: string, textKey: string) => ['voice', 'clip', lang, textKey] as const

// Audio is generated on the first request for a text, so a clip is looked up only when
// the resident presses play, never on mount (a screen can show many cards).
const clipQuery = (lang: string, textKey: string) => ({
  queryKey: voiceClipQueryKey(lang, textKey),
  queryFn: () => api.voice.clip({ key: textKey, lang }),
  staleTime: Infinity,
})

/** The clip if it was already looked up (no request), plus a function that looks it up (cached). */
export function useClip(lang: string, textKey: string) {
  const queryClient = useQueryClient()
  const cached = useQuery({ ...clipQuery(lang, textKey), enabled: false })
  const fetchClip = useCallback((): Promise<VoiceClip> => queryClient.fetchQuery(clipQuery(lang, textKey)), [queryClient, lang, textKey])
  return { clip: cached.data, fetchClip }
}

/** Looks up clips by key on demand (cached), for reading several texts in a row. */
export function useClipFetcher(lang: string) {
  const queryClient = useQueryClient()
  return useCallback((textKey: string): Promise<VoiceClip> => queryClient.fetchQuery(clipQuery(lang, textKey)), [queryClient, lang])
}

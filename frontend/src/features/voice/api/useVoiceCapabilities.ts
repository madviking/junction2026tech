import { useQuery } from '@tanstack/react-query'
import type { VoiceCapabilities } from '@/features/voice/types'
import { api } from '@/shared/api/api'
import { useContent } from '@/shared/i18n'

export const voiceCapabilitiesQueryKey = ['voice', 'capabilities'] as const

/**
 * Voice capabilities of the current content language (or `lang`), from
 * GET /api/voice/capabilities. Null while loading, on error and for an unknown language:
 * callers then simply show no voice controls (voice is an addition, never required).
 */
export function useVoiceCapabilities(lang?: string): VoiceCapabilities | null {
  const contentLang = useContent().lang
  const target = lang ?? contentLang
  const query = useQuery({
    queryKey: voiceCapabilitiesQueryKey,
    queryFn: () => api.voice.capabilities(),
    staleTime: Infinity,
  })
  return query.data?.languages.find((l) => l.lang === target) ?? null
}

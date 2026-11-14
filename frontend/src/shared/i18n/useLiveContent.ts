import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/api'

export const contentQueryKey = (lang: string) => ['content', 'live', lang] as const

/** The published content in one language (texts, journey, cards). */
export function useLiveContent(lang: string) {
  return useQuery({
    queryKey: contentQueryKey(lang),
    queryFn: () => api.content.live({ lang }),
    staleTime: 60_000,
  })
}

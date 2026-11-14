import { useMutation } from '@tanstack/react-query'
import type { MatchFn } from '@/features/journey/types'
import { api } from '@/shared/api/api'

/** Free text or a voice transcript → a card of a closed set (POST /api/cards/match). */
export function useCardMatch(lang: string): MatchFn {
  const mutation = useMutation({
    mutationFn: (params: Parameters<MatchFn>[0]) => api.cards.match({ ...params, lang }),
  })
  return mutation.mutateAsync
}

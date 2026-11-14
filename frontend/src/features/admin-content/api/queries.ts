import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAdminApi } from '@/features/admin-auth'
import { contentAdminKeys } from '@/features/admin-content/api/keys'
import type { TextFilters } from '@/features/admin-content/types'

/** Text rows of the draft (or the live version when there is no draft), filtered on the server. */
export function useAdminTexts(filters: TextFilters) {
  const api = useAdminApi()
  return useQuery({
    queryKey: contentAdminKeys.texts(filters),
    queryFn: () =>
      api.content.adminTexts({
        lang: filters.lang || undefined,
        filter: filters.filter,
        group: filters.group || undefined,
        search: filters.search.trim() || undefined,
      }),
    placeholderData: keepPreviousData,
  })
}

/** The draft: summary (based on, changed keys, counts) and its validation issues. */
export function useDraft() {
  const api = useAdminApi()
  return useQuery({ queryKey: contentAdminKeys.draft, queryFn: () => api.content.adminDraft() })
}

/** Clinical and legal review flags of the live structure. */
export function useReviewFlags() {
  const api = useAdminApi()
  return useQuery({ queryKey: contentAdminKeys.flags, queryFn: () => api.content.adminReviewFlags(), staleTime: 60_000 })
}

/** Published versions, newest first. */
export function useVersions() {
  const api = useAdminApi()
  return useQuery({ queryKey: contentAdminKeys.versions, queryFn: () => api.content.adminVersions() })
}

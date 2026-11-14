import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAdminApi } from '@/features/admin-auth'
import { contentAdminKeys } from '@/features/admin-content/api/keys'
import { downloadTextFile } from '@/features/admin-content/lib/format'

/** Refreshes this feature's queries, and the resident content cache after a live change. */
function useInvalidate() {
  const queryClient = useQueryClient()
  return async (liveChanged: boolean) => {
    await queryClient.invalidateQueries({ queryKey: contentAdminKeys.all })
    if (liveChanged) await queryClient.invalidateQueries({ queryKey: ['content'] })
  }
}

/** Saves one language of one text into the draft (an empty text removes it). */
export function useSetText() {
  const api = useAdminApi()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: { key: string; lang: string; text: string }) => api.content.adminSetText(input),
    onSuccess: () => invalidate(false),
  })
}

/** Marks one language of one text checked or unchecked (reviewer = the signed-in admin). */
export function useSetReview() {
  const api = useAdminApi()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: { key: string; lang: string; status: 'checked' | 'unchecked' }) => api.content.adminSetReview(input),
    onSuccess: () => invalidate(false),
  })
}

/** Publishes the draft as a new live version. An invalid draft is refused with its issues. */
export function usePublish() {
  const api = useAdminApi()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (note: string) => api.content.adminPublish({ note: note.trim() || undefined }),
    onSuccess: () => invalidate(true),
  })
}

/** Throws the draft away; the live version is untouched. */
export function useDiscard() {
  const api = useAdminApi()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: () => api.content.adminDiscard(),
    onSuccess: () => invalidate(false),
  })
}

/** Makes an older published version live again. */
export function useRollback() {
  const api = useAdminApi()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (version: number) => api.content.adminRollback({ version }),
    onSuccess: () => invalidate(true),
  })
}

/** Downloads the live version as rules.yaml. */
export function useExportLive() {
  const api = useAdminApi()
  return useMutation({
    mutationFn: () => api.content.adminExport(),
    onSuccess: (result) => downloadTextFile('rules.yaml', result.yaml),
  })
}

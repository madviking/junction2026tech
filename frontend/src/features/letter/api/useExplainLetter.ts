import { useMutation } from '@tanstack/react-query'
import { preparePhoto } from '@/features/letter/lib/preparePhoto'
import { api } from '@/shared/api/api'

/**
 * Shrinks the photo in the browser, then POST /api/letters/explain. Nothing is cached:
 * the photo and the explanation are gone when the page is left.
 */
export function useExplainLetter() {
  return useMutation({
    mutationFn: async ({ lang, file }: { lang: string; file: File }) =>
      api.letters.explain({ lang, ...(await preparePhoto(file)) }),
    gcTime: 0,
  })
}

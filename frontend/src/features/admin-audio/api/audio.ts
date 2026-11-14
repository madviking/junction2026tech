import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAdminApi } from '@/features/admin-auth'
import { audioMime, fileToBase64 } from '@/features/admin-audio/lib/files'

export const audioAdminKeys = {
  all: ['admin-audio'] as const,
  capabilities: ['admin-audio', 'capabilities'] as const,
  assets: (lang: string) => ['admin-audio', 'assets', lang] as const,
}

/** Languages with their voice capabilities (audio output, generated audio review). */
export function useVoiceLanguages() {
  const api = useAdminApi()
  return useQuery({ queryKey: audioAdminKeys.capabilities, queryFn: () => api.voice.capabilities(), staleTime: 300_000 })
}

/** One row per published text key in a language: current generated and human audio, what is served, stale count. */
export function useAudioAssets(lang: string) {
  const api = useAdminApi()
  return useQuery({ queryKey: audioAdminKeys.assets(lang), queryFn: () => api.voice.adminAssets({ lang }) })
}

function useInvalidateAudio() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: audioAdminKeys.all })
}

/** Generates text-to-speech audio for the current text (reuses stored audio for the same text). */
export function useGenerateAudio() {
  const api = useAdminApi()
  const invalidate = useInvalidateAudio()
  return useMutation({
    mutationFn: (input: { key: string; lang: string }) => api.voice.adminGenerate(input),
    onSuccess: () => invalidate(),
  })
}

/** Uploads a human recording for the current text; it stays unchecked until approved. */
export function useUploadRecording() {
  const api = useAdminApi()
  const invalidate = useInvalidateAudio()
  return useMutation({
    mutationFn: async (input: { key: string; lang: string; file: File }) =>
      api.voice.adminUpload({ key: input.key, lang: input.lang, mime: audioMime(input.file), audioBase64: await fileToBase64(input.file) }),
    onSuccess: () => invalidate(),
  })
}

/** Approves an asset; an approved human recording is served instead of generated audio. */
export function useApproveAudio() {
  const api = useAdminApi()
  const invalidate = useInvalidateAudio()
  return useMutation({
    mutationFn: (assetId: number) => api.voice.adminApprove({ assetId }),
    onSuccess: () => invalidate(),
  })
}

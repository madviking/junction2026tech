import { useMutation } from '@tanstack/react-query'
import { api } from '@/shared/api/api'

type TranscribeParams = Parameters<typeof api.voice.transcribe>[0]

/** POST /api/voice/transcribe. Nothing is cached: the recording and transcript are not kept. */
export function useTranscribe() {
  return useMutation({
    mutationFn: (params: TranscribeParams) => api.voice.transcribe(params),
    gcTime: 0,
  })
}

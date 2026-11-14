import { useState } from 'react'
import { useTranscribe } from '@/features/voice/api/useTranscribe'
import { useVoiceCapabilities } from '@/features/voice/api/useVoiceCapabilities'
import { useRecorder, type RecorderFailure, type Recording } from '@/features/voice/state/recorder'
import { useContent } from '@/shared/i18n'
import { RecordButton, Stack, Text, type RecordState } from '@/shared/ui'

export interface RecordAnswerButtonProps {
  /** Called with the transcript of a short recorded answer (recording and transcript are not stored). */
  onTranscript: (text: string) => void
  disabled?: boolean
  /** 48px button without the caption, for a row next to a text field. */
  compact?: boolean
}

type Problem = 'mic_denied' | 'record_error' | 'no_speech'

const failureProblem: Record<RecorderFailure, Problem> = { denied: 'mic_denied', unsupported: 'record_error', failed: 'record_error' }

/**
 * Records a short answer (max 30 s; press again to stop), transcribes it in the current
 * language and hands the text to `onTranscript`. Renders nothing where voice input is off
 * (Somali). The recording lives in memory only.
 */
export function RecordAnswerButton({ onTranscript, disabled, compact }: RecordAnswerButtonProps) {
  const { lang, t } = useContent()
  const caps = useVoiceCapabilities()
  const transcribe = useTranscribe()
  const [problem, setProblem] = useState<Problem | null>(null)

  const onRecording = ({ audioBase64, mime }: Recording) => {
    transcribe.mutate(
      { lang, audioBase64, mime },
      {
        onSuccess: ({ text }) => {
          const trimmed = text.trim()
          if (trimmed) onTranscript(trimmed)
          else setProblem('no_speech')
        },
        onError: () => setProblem('record_error'),
      },
    )
  }
  const recorder = useRecorder({ onRecording, onFailure: (reason) => setProblem(failureProblem[reason]) })

  if (!caps?.voiceInput) return null

  const state: RecordState = transcribe.isPending ? 'processing' : recorder.recording ? 'recording' : disabled ? 'disabled' : 'idle'
  const label = state === 'processing' ? t('ui.voice.processing') : state === 'recording' ? t('ui.voice.recording') : t('ui.voice.record')

  const onPress = () => {
    if (state === 'recording') {
      recorder.stop()
      return
    }
    if (state !== 'idle') return
    setProblem(null)
    void recorder.start()
  }

  return (
    <Stack gap="xs" align="center">
      <RecordButton state={state} label={label} onPress={onPress} elapsedSeconds={recorder.elapsed} size={compact ? 'sm' : 'lg'} />
      <div role="status" aria-live="polite">
        {problem && (
          <Text variant="caption" tone="danger">
            {t(`ui.voice.${problem}`)}
          </Text>
        )}
      </div>
    </Stack>
  )
}

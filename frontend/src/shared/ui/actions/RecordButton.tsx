import { Loader } from '@mantine/core'
import { IconMicrophone, IconPlayerStopFilled } from '@tabler/icons-react'
import { formatElapsed } from '@/shared/ui/actions/formatElapsed'
import { Text } from '@/shared/ui/typography/Text'
import classes from './actions.module.css'

export type RecordState = 'idle' | 'recording' | 'processing' | 'disabled'

export interface RecordButtonProps {
  state: RecordState
  /** Accessible name and visible caption, for example "Tap to speak" or "Stop recording". */
  label: string
  onPress: () => void
  /** Shown as m:ss while recording. */
  elapsedSeconds?: number
}

/** Presentational 80px microphone button. The feature owns MediaRecorder. */
export function RecordButton({ state, label, onPress, elapsedSeconds }: RecordButtonProps) {
  const inactive = state === 'processing' || state === 'disabled'
  return (
    <div className={classes.record}>
      <button
        type="button"
        className={classes.recordButton}
        data-state={state}
        aria-label={label}
        aria-pressed={state === 'recording'}
        aria-busy={state === 'processing' || undefined}
        disabled={inactive}
        onClick={onPress}
      >
        {state === 'processing' ? (
          <Loader size={28} color="primary" />
        ) : state === 'recording' ? (
          <IconPlayerStopFilled size={32} aria-hidden="true" />
        ) : (
          <IconMicrophone size={36} aria-hidden="true" />
        )}
      </button>
      <Text as="span" variant="label" tone={state === 'disabled' ? 'muted' : 'default'}>
        {label}
      </Text>
      {state === 'recording' && elapsedSeconds !== undefined && (
        <Text as="span" variant="caption" tone="emergency">
          {formatElapsed(elapsedSeconds)}
        </Text>
      )}
    </div>
  )
}

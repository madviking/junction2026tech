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
  /** `sm`: 48px without the visible caption, for a row next to a text field. */
  size?: 'lg' | 'sm'
}

/** Presentational 80px microphone button. The feature owns MediaRecorder. */
export function RecordButton({ state, label, onPress, elapsedSeconds, size = 'lg' }: RecordButtonProps) {
  const small = size === 'sm'
  const inactive = state === 'processing' || state === 'disabled'
  return (
    <div className={classes.record} data-size={size}>
      <button
        type="button"
        className={classes.recordButton}
        data-state={state}
        data-size={size}
        aria-label={label}
        aria-pressed={state === 'recording'}
        aria-busy={state === 'processing' || undefined}
        disabled={inactive}
        onClick={onPress}
      >
        {state === 'processing' ? (
          <Loader size={small ? 20 : 28} color="primary" />
        ) : state === 'recording' ? (
          <IconPlayerStopFilled size={small ? 22 : 32} aria-hidden="true" />
        ) : (
          <IconMicrophone size={small ? 24 : 36} aria-hidden="true" />
        )}
      </button>
      {!small && (
        <Text as="span" variant="label" tone={state === 'disabled' ? 'muted' : 'default'}>
          {label}
        </Text>
      )}
      {state === 'recording' && elapsedSeconds !== undefined && (
        <Text as="span" variant="caption" tone="emergency">
          {formatElapsed(elapsedSeconds)}
        </Text>
      )}
    </div>
  )
}

import { Loader } from '@mantine/core'
import { IconAlertCircle, IconPlayerStopFilled, IconVolume } from '@tabler/icons-react'
import classes from './actions.module.css'

export type AudioPlayState = 'idle' | 'loading' | 'playing' | 'error'

export interface AudioPlayButtonProps {
  state: AudioPlayState
  /** Accessible name, for example "Listen: I found a lump" (or "Stop" while playing). */
  label: string
  onPress: () => void
  disabled?: boolean
}

/** Presentational "listen" button: a quiet 48px target with a small speaker; a flat segment at the end of a ChoiceCard. The feature owns the audio element. */
export function AudioPlayButton({ state, label, onPress, disabled }: AudioPlayButtonProps) {
  return (
    <button
      type="button"
      className={classes.audio}
      data-state={state}
      aria-label={label}
      aria-pressed={state === 'playing'}
      aria-busy={state === 'loading' || undefined}
      disabled={disabled}
      onClick={onPress}
    >
      {state === 'loading' && <Loader size={18} color="primary" />}
      {state === 'idle' && <IconVolume size={20} aria-hidden="true" />}
      {state === 'playing' && <IconPlayerStopFilled size={18} aria-hidden="true" />}
      {state === 'error' && <IconAlertCircle size={20} aria-hidden="true" />}
    </button>
  )
}

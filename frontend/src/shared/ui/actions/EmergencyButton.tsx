import { IconUrgent } from '@tabler/icons-react'
import classes from './actions.module.css'

export interface EmergencyButtonProps {
  /** Localised text, for example "Urgent help". Always visible. */
  label: string
  onPress: () => void
}

/**
 * The red header control of resident pages: opens urgent help (the emergency signs and the
 * call to 112). Same look as the compact EmergencyCallLink. One per screen.
 */
export function EmergencyButton({ label, onPress }: EmergencyButtonProps) {
  return (
    <button type="button" className={classes.emergencyLink} data-compact onClick={onPress} aria-haspopup="dialog">
      <IconUrgent size={22} aria-hidden="true" />
      <span>{label}</span>
    </button>
  )
}

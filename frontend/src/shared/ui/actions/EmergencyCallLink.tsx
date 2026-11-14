import { IconPhoneCall } from '@tabler/icons-react'
import { VisuallyHidden } from '@/shared/ui/layout/Layout'
import classes from './actions.module.css'

export interface EmergencyCallLinkProps {
  /** Localised text, for example "Emergency? Call". */
  label: string
  /** Digits to dial, for example "112". Always shown left-to-right. */
  phoneNumber: string
  /** Header pill: icon and number only; the label stays as the accessible name. */
  compact?: boolean
}

/** Always-visible red call link for the PageShell emergency slot. Opens the dialer. */
export function EmergencyCallLink({ label, phoneNumber, compact }: EmergencyCallLinkProps) {
  return (
    <a className={classes.emergencyLink} data-compact={compact || undefined} href={`tel:${phoneNumber}`}>
      <IconPhoneCall size={22} aria-hidden="true" />
      {compact ? <VisuallyHidden>{label}</VisuallyHidden> : <span>{label}</span>}
      <span className={classes.emergencyNumber}>{phoneNumber}</span>
    </a>
  )
}

import { IconPhoneCall } from '@tabler/icons-react'
import classes from './actions.module.css'

export interface EmergencyCallLinkProps {
  /** Localised text, for example "Emergency? Call". */
  label: string
  /** Digits to dial, for example "112". Always shown left-to-right. */
  phoneNumber: string
}

/** Always-visible red call link for the PageShell emergency slot. Opens the dialer. */
export function EmergencyCallLink({ label, phoneNumber }: EmergencyCallLinkProps) {
  return (
    <a className={classes.emergencyLink} href={`tel:${phoneNumber}`}>
      <IconPhoneCall size={22} aria-hidden="true" />
      <span>{label}</span>
      <span className={classes.emergencyNumber}>{phoneNumber}</span>
    </a>
  )
}

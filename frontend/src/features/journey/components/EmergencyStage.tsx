import type { StageProps } from '@/features/journey/components/stageProps'
import { UrgentContent } from '@/features/urgent'

/**
 * Emergency: one screen, one action. The large call link to 112 is in the bottom bar
 * (JourneyScreen); this screen shows the same urgent content as "Urgent help" in the header
 * (the title, the signs, each with a listen button). No forms, no other choices.
 */
export function EmergencyStage(_props: StageProps) {
  return <UrgentContent />
}

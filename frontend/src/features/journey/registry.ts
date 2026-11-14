import { ClosedStage } from '@/features/journey/components/ClosedStage'
import { ContactStage } from '@/features/journey/components/ContactStage'
import { EmergencyStage } from '@/features/journey/components/EmergencyStage'
import { RouteStage } from '@/features/journey/components/RouteStage'
import { StalledStage } from '@/features/journey/components/StalledStage'
import { StageCards } from '@/features/journey/components/StageCards'
import type { StageComponent } from '@/features/journey/components/stageProps'
import { VisitStage } from '@/features/journey/components/VisitStage'

/**
 * Stage id → special screen. A stage without an entry (describe, wait, followup, or any
 * stage added in the content) renders `StageCards`: its question and outcome cards.
 * `describe` needs no entry: StageCards opens the symptom picker for any outcome with
 * `sets: 'lane'` (and the route cards for `sets: 'route'`).
 */
export const stageComponents: Record<string, StageComponent> = {
  route: RouteStage,
  contact: ContactStage,
  stalled: StalledStage,
  emergency: EmergencyStage,
  visit: VisitStage,
  closed: ClosedStage,
}

export { outcomeCards } from '@/features/journey/outcomeCards'

export function stageComponentFor(stageId: string): StageComponent {
  return stageComponents[stageId] ?? StageCards
}

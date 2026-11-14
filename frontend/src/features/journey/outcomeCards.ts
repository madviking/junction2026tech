import type { OutcomeCardComponent } from '@/features/journey/components/stageProps'

/**
 * Outcome id → special card. An outcome without an entry renders the default ChoiceCard
 * (`components/DefaultOutcomeCard.tsx`). Empty tonight: every outcome uses the default.
 */
export const outcomeCards: Record<string, OutcomeCardComponent> = {}

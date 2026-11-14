import { IconClockPause, IconHeartbeat, IconMailOpened, type Icon } from '@tabler/icons-react'

/**
 * Picture for an outcome card, by `<stage>.<outcome>` (presentation only, never sent).
 * An outcome without an entry shows no picture, so content can add outcomes without code.
 */
const OUTCOME_ICONS: Record<string, Icon> = {
  'describe.symptom': IconHeartbeat,
  'describe.letter': IconMailOpened,
  'describe.waiting': IconClockPause,
}

export function outcomeIcon(stage: string, outcome: string): Icon | undefined {
  return OUTCOME_ICONS[`${stage}.${outcome}`]
}

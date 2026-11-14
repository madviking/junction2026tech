import type { VisitView } from '@/features/journey/types'

export interface PathStepView {
  id: string
  text: string
  status: 'done' | 'current' | 'upcoming'
}

/** Stages with no step of their own count as the step they belong to. */
const STAGE_FALLBACK: Record<string, string> = { stalled: 'contact' }
/** Step text keys shown before the care path exists (no lane or route yet). */
const GENERIC_STEPS = [
  { stage: 'describe', key: 'step.describe' },
  { stage: 'route', key: 'step.route' },
  { stage: 'wait', key: 'step.wait' },
  { stage: 'visit', key: 'step.visit' },
  { stage: 'followup', key: 'step.followup' },
] as const

/**
 * The person's care path as ordered steps with "you are here": the composed care path
 * (hoitopolku) when the visit has one, else the general steps from the content. Step
 * `detail` is a design note for staff views, not resident wording, so it is left out.
 */
export function pathSteps(view: VisitView, t: (key: string) => string, has: (key: string) => boolean): { steps: PathStepView[]; current: number } {
  const stage = view.stage.id
  const source = view.carePath
    ? view.carePath.steps.map((s) => ({ stage: s.stage, text: s.text }))
    : GENERIC_STEPS.filter((s) => has(s.key)).map((s) => ({ stage: s.stage, text: t(s.key) }))
  const indexOf = (id: string) => source.findIndex((s) => s.stage === id)
  let current = indexOf(stage)
  if (current < 0 && STAGE_FALLBACK[stage]) current = indexOf(STAGE_FALLBACK[stage])
  if (stage === 'closed') current = source.length
  if (current < 0) current = 0
  // Several steps can share a stage (an added step for a barrier): the last one is "now".
  let last = current
  while (last + 1 < source.length && source[last + 1]!.stage === source[current]?.stage) last += 1
  const steps = source.map((s, i) => ({
    id: String(i),
    text: s.text,
    status: i < current ? ('done' as const) : i <= last ? ('current' as const) : ('upcoming' as const),
  }))
  return { steps, current: Math.min(last + 1, source.length) }
}

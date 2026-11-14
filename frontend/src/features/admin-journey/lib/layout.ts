import type { GraphStage, JourneyGraph, ValidationIssue } from '@/features/admin-journey/types'

export type ColumnKind = 'distance' | 'interrupt' | 'unreachable'

export interface GraphColumn {
  key: string
  title: string
  kind: ColumnKind
  stages: GraphStage[]
}

/** DOM id of a stage card (scroll target of the outcome links). */
export const stageDomId = (stageId: string) => `journey-stage-${stageId}`

/** Breadth-first distances over outcome `next` links from the given stages (unknown targets are skipped). */
export function distances(graph: JourneyGraph, from: string[]): Map<string, number> {
  const byId = new Map(graph.stages.map((s) => [s.id, s]))
  const dist = new Map<string, number>()
  const queue: string[] = []
  for (const id of from) {
    if (byId.has(id) && !dist.has(id)) {
      dist.set(id, 0)
      queue.push(id)
    }
  }
  while (queue.length) {
    const id = queue.shift()!
    for (const o of byId.get(id)!.outcomes) {
      if (byId.has(o.next) && !dist.has(o.next)) {
        dist.set(o.next, dist.get(id)! + 1)
        queue.push(o.next)
      }
    }
  }
  return dist
}

/**
 * Columns by distance from the start stage (document order inside a column), then the
 * stages reached only through an interrupt, then the stages nothing leads to.
 */
export function layoutColumns(graph: JourneyGraph): GraphColumn[] {
  const fromStart = distances(graph, [graph.start])
  const fromInterrupts = distances(graph, graph.interrupts.map((i) => i.next))
  const columns: GraphColumn[] = []
  const max = Math.max(-1, ...fromStart.values())
  for (let d = 0; d <= max; d++) {
    const stages = graph.stages.filter((s) => fromStart.get(s.id) === d)
    columns.push({ key: `d${d}`, title: d === 0 ? 'Start' : `Step ${d}`, kind: 'distance', stages })
  }
  const viaInterrupt = graph.stages.filter((s) => !fromStart.has(s.id) && fromInterrupts.has(s.id))
  if (viaInterrupt.length) columns.push({ key: 'interrupt', title: 'Reached by an interrupt', kind: 'interrupt', stages: viaInterrupt })
  const unreachable = graph.stages.filter((s) => !fromStart.has(s.id) && !fromInterrupts.has(s.id))
  if (unreachable.length) columns.push({ key: 'unreachable', title: 'Not reachable', kind: 'unreachable', stages: unreachable })
  return columns
}

/** Validation issues about one stage or anything inside it (its outcomes). */
export function stageIssues(issues: ValidationIssue[], stageId: string): ValidationIssue[] {
  const base = `journey.stages.${stageId}`
  return issues.filter((i) => i.path === base || i.path.startsWith(`${base}.`))
}

/** Validation issues about one outcome. */
export function outcomeIssues(issues: ValidationIssue[], stageId: string, outcomeId: string): ValidationIssue[] {
  const base = `journey.stages.${stageId}.outcomes.${outcomeId}`
  return issues.filter((i) => i.path === base || i.path.startsWith(`${base}.`))
}

/** Errors first, then warnings; document order inside each. */
export function sortIssues(issues: ValidationIssue[]): ValidationIssue[] {
  return [...issues.filter((i) => i.severity === 'error'), ...issues.filter((i) => i.severity !== 'error')]
}

const ID = /^[a-z][a-z0-9_]{1,40}$/

/** Same id rule as the backend: lowercase letter, then 1–40 of a-z, 0-9, _. Null when valid. */
export function idProblem(id: string, taken: string[]): string | null {
  if (!ID.test(id)) return 'Use a lowercase letter, then 1–40 lowercase letters, digits or _'
  if (taken.includes(id)) return 'This id is already used'
  return null
}

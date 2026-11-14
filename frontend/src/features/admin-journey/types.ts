import type { content, domain } from '@/shared/api/client'

// Short names for the generated journey editor types used by this feature.
export type JourneyGraph = content.JourneyGraph
export type GraphStage = content.GraphStage
export type GraphOutcome = content.GraphOutcome
export type GraphInterrupt = content.GraphInterrupt
export type GraphReviewFlag = content.GraphReviewFlag
export type ValidationIssue = domain.ValidationIssue

/** What the side drawer edits; null = closed. */
export type JourneyEdit =
  | { kind: 'add-stage' }
  | { kind: 'add-outcome'; stage: string }
  | { kind: 'set-next'; stage: string; outcome: GraphOutcome }

/** A removal waiting for its inline confirmation. */
export type PendingRemoval = { kind: 'stage'; stage: string } | { kind: 'outcome'; stage: string; outcome: string }

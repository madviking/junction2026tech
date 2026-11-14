import type { content, domain, health, letters } from '@/shared/api/client'

// Short names for generated types. Add aliases here, never hand-written shapes.
export type HealthStatus = health.HealthStatus
export type DependencyCheck = health.DependencyCheck

export type LiveBundle = content.LiveBundle
export type ResolvedText = domain.ResolvedText
export type LanguageDef = domain.LanguageDef
export type JourneyView = domain.JourneyView
export type StageView = domain.StageView
export type OutcomeView = domain.OutcomeView
export type ContentCards = domain.Cards

export type LetterExplanation = letters.LetterExplanation

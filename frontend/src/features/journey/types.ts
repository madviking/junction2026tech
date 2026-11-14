import type { cards, visits } from '@/shared/api/client'

// Short names for the generated contract types this feature uses.
export type VisitView = visits.VisitView
export type OutcomeCard = visits.OutcomeCard
export type SymptomOption = visits.SymptomOption
export type EventRequest = visits.EventRequest
export type MatchRequest = cards.MatchRequest
export type MatchResponse = cards.MatchResponse
export type MatchOption = cards.MatchOption

/** Which closed card set free text is matched against. */
export type MatchSet = MatchRequest['set']

/** An event the screen sends; the page adds the language. */
export type JourneyEvent = Omit<EventRequest, 'lang'>

/** Free text → card, through POST /api/cards/match (the page adds the language). */
export type MatchFn = (params: Omit<MatchRequest, 'lang'>) => Promise<MatchResponse>

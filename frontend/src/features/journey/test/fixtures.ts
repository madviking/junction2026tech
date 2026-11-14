import { vi } from 'vitest'
import type { VisitView } from '@/features/journey/types'
import type { LiveBundle, OutcomeView, ResolvedText, StageView } from '@/shared/api/types'

const text = (value: string): ResolvedText => ({ text: value, lang: 'en', review: 'checked', fallback: false })

const outcome = (id: string, extra: Partial<OutcomeView> = {}): OutcomeView => ({
  id,
  next: 'route',
  sets: null,
  setsLane: null,
  records: null,
  maxTries: null,
  afterMax: null,
  climb: false,
  review: null,
  ...extra,
})

const stage = (id: string, outcomes: OutcomeView[]): StageView => ({ id, outcomes, terminal: false, ladder: 0, checkIns: [], overdueNext: null })

export const describeStage = stage('describe', [outcome('symptom', { sets: 'lane' }), outcome('letter', { setsLane: 'U4' })])

export const bundle: LiveBundle = {
  version: 1,
  lang: 'en',
  dir: 'ltr',
  placeholder: false,
  languages: [
    { code: 'en', name: 'English', dir: 'ltr', placeholder: false, profile: 'C2' },
    { code: 'ar', name: 'العربية', dir: 'rtl', placeholder: true, profile: 'C2' },
  ],
  texts: {
    'ui.journey.match.label': text('Describe in your own words'),
    'ui.journey.match.submit': text('Check'),
    'ui.journey.match.readback': text('Did you mean: {text}?'),
    'ui.journey.match.yes': text('Yes'),
    'ui.journey.match.no': text('No'),
    'ui.journey.match.choose': text('Please choose a card.'),
    'ui.journey.symptom.title': text('What worries you?'),
    'ui.journey.symptom.confirm': text('Continue'),
    'ui.journey.error.not_found': text('We could not find this code.'),
    'ui.journey.error.back_start': text('Back to start'),
    'ui.journey.placeholder': text('Translation not yet checked'),
    'card.symptom.lump.card': text('A new lump'),
    'card.symptom.cough.card': text('A long cough'),
    'card.emergency.chest_pain': text('Chest pain'),
    'journey.interrupt.emergency_sign.card': text('This is an emergency'),
    'journey.interrupt.something_changed.card': text('Something changed'),
    'ui.journey.emergency.title': text('Call 112 now'),
    'ui.journey.error.send': text('Your answer was not saved.'),
  },
  journey: {
    start: 'describe',
    interrupts: [
      { id: 'emergency_sign', next: 'emergency' },
      { id: 'something_changed', next: 'describe' },
    ],
    routeFact: { askAt: 'route', questions: 0, ifUnknownRoute: 'A1', ifUnknownReview: null },
    stages: [describeStage],
  },
  cards: { symptoms: [{ id: 'lump', lane: 'U2' }, { id: 'cough', lane: 'U2' }], emergencySigns: ['chest_pain'], clinicianStage: 'visit', clinician: [] },
  lanes: ['U2'],
  routes: ['A1'],
}

export const CODE = 'SLT-TEST-0001'

export function visitView(overrides: Partial<VisitView> = {}): VisitView {
  return {
    code: CODE,
    lang: 'en',
    interpreterNeeded: true,
    county: 'helsinki',
    state: { stage: 'describe', lane: null, route: null, ladderStep: 0, visitDate: null, tries: [] },
    stage: describeStage,
    ask: 'What do you need help with?',
    outcomes: [
      { id: 'symptom', text: 'I have a symptom', then: null },
      { id: 'letter', text: 'I got a letter', then: null },
    ],
    interrupts: [
      { id: 'emergency_sign', text: 'This is an emergency' },
      { id: 'something_changed', text: 'Something changed' },
    ],
    then: null,
    ladder: null,
    symptoms: [
      { id: 'lump', text: 'A new lump', selected: false },
      { id: 'cough', text: 'A long cough', selected: false },
    ],
    carePath: null,
    nextSteps: [],
    history: [],
    ...overrides,
  }
}

export interface Call {
  method: string
  path: string
  body: unknown
}

/**
 * Stubs fetch (the network boundary) with a tiny fake backend. `routes` maps
 * "METHOD /path" to a JSON body or a Response; everything else is 404.
 */
export function stubBackend(routes: Record<string, unknown>) {
  const calls: Call[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
      const method = init?.method ?? 'GET'
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
      calls.push({ method, path: url.pathname, body })
      const hit = routes[`${method} ${url.pathname}`]
      if (hit === undefined) return Response.json({ code: 'not_found', message: 'not found' }, { status: 404 })
      return hit instanceof Response ? hit : Response.json(hit)
    }),
  )
  return calls
}

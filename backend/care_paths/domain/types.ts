// Care-path content model. Pure types, no Encore imports: shared by care_paths,
// content and visits. All wording lives in `texts`; the structure holds codes,
// flags and links only (keys for wording come from keys.ts).

// Literal unions written out: the Encore type parser does not support typeof X[number].
// Order is the language picker order: national languages, then by speakers in Finland.
export type Lang = 'en' | 'fi' | 'sv' | 'ru' | 'et' | 'uk' | 'ar' | 'so' | 'fa' | 'zh' | 'yue' | 'vi' | 'th' | 'bg'
export const LANGS: readonly Lang[] = ['en', 'fi', 'sv', 'ru', 'et', 'uk', 'ar', 'so', 'fa', 'zh', 'yue', 'vi', 'th', 'bg']

// Stages a barrier step can attach to (the care-path overview), from rules.yaml.
export const CARE_STEP_STAGES = ['describe', 'route', 'contact', 'wait', 'visit', 'followup'] as const
export type ClockBasis = 'legal' | 'recommended' | 'open'
export const CLOCK_BASES: readonly ClockBasis[] = ['legal', 'recommended', 'open']
export type ReviewKind = 'clinical' | 'legal'

export interface LaneDef {
  needsClinicalReview: boolean
}

export interface RouteDef {
  careGuarantee: boolean
  needsLegalReview: boolean
  // True when texts `route.<code>.extra_step.text` (and optional `.detail`) exist.
  extraStep: boolean
}

// Profiles carry wording only (texts profile.<code>.*); the structure lists the codes.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ProfileDef {}

export interface BarrierDef {
  // Stage in CARE_STEP_STAGES where the barrier adds a step, if any.
  stepStage: string | null
}

export interface ClockDef {
  basis: ClockBasis
}

export interface RuleDef {
  lane: string
  route: string | null
  clocks: ClockDef[]
  // Replaces `clocks` for routes without the care guarantee.
  clocksWithoutCareGuarantee: ClockDef[] | null
}

// How an outcome changes the journey state besides moving to `next`.
// lane: the caller passes a lane (from the chosen symptom card).
// route: the caller passes a route (from the chosen route card).
// route_if_unknown: the route becomes journey.facts.route.ifUnknownRoute.
export type OutcomeSets = 'lane' | 'route' | 'route_if_unknown'

export interface OutcomeDef {
  next: string
  sets: OutcomeSets | null
  setsLane: string | null
  records: string | null
  maxTries: number | null
  afterMax: string | null
  // Moves one rung up the stage's escalation ladder.
  climb: boolean
  review: ReviewKind | null
}

export interface StageDef {
  terminal: boolean
  // Number of ladder rungs (texts journey.stage.<id>.ladder.<i>), 0 when none.
  ladder: number
  checkIns: string[]
  overdueNext: string | null
  // Ordered: the order is the card order on screen.
  outcomes: Record<string, OutcomeDef>
}

export interface InterruptDef {
  next: string
}

export interface RouteFact {
  askAt: string
  questions: number
  ifUnknownRoute: string
  ifUnknownReview: ReviewKind | null
}

export interface JourneyDef {
  start: string
  interrupts: Record<string, InterruptDef>
  facts: { route: RouteFact }
  stages: Record<string, StageDef>
}

export interface Structure {
  lanes: Record<string, LaneDef>
  routes: Record<string, RouteDef>
  profiles: Record<string, ProfileDef>
  barriers: Record<string, BarrierDef>
  rules: RuleDef[]
  journey: JourneyDef
}

export interface SymptomCard {
  id: string
  lane: string
}

export interface ClinicianCard {
  // An outcome of the clinician stage; its texts give the card and the next step.
  outcome: string
}

export interface Cards {
  symptoms: SymptomCard[]
  emergencySigns: string[]
  clinicianStage: string
  clinician: ClinicianCard[]
}

export type ReviewStatus = 'unchecked' | 'checked'

export interface TextEntry {
  text: string
  review: ReviewStatus
  reviewer?: string
  reviewedAt?: string
}

// key -> language code -> entry. Plain string keys so the type crosses Encore APIs.
export type Texts = Record<string, Record<string, TextEntry>>

export interface LanguageDef {
  code: Lang
  name: string
  dir: 'ltr' | 'rtl'
  // Placeholder languages show an "unchecked translation" marker on every screen.
  placeholder: boolean
  // Communication profile (rules.yaml profiles) used for this language's care path.
  profile: string
}

export interface ContentDoc {
  schemaVersion: 1
  languages: LanguageDef[]
  structure: Structure
  cards: Cards
  texts: Texts
}

export interface ValidationIssue {
  severity: 'error' | 'warning'
  path: string
  message: string
}

export class ContentError extends Error {
  constructor(public readonly issues: ValidationIssue[]) {
    super(
      `content invalid: ${issues
        .filter((i) => i.severity === 'error')
        .map((i) => `${i.path}: ${i.message}`)
        .join('; ')}`,
    )
    this.name = 'ContentError'
  }
}

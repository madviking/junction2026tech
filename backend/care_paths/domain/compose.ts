// Compose one person's care path (port of the Python care_paths service).
// Equality rule: lane + route decide destination and clocks; profile and barriers
// only add adaptations and steps.
import * as k from './keys'
import { optionalText, textOf } from './texts'
import type { ClockBasis, ContentDoc, Lang, ReviewKind, RuleDef } from './types'

export interface ComposeInput {
  lane: string
  route: string
  profile: string
  barriers: string[]
  lang: Lang
}

export interface PathClock {
  label: string
  limit: string
  basis: ClockBasis
}

export interface PathAdaptation {
  code: string
  name: string
  how: string
  right: string | null
}

export interface PathStep {
  text: string
  detail: string | null
  adaptation: string | null
}

export interface ReviewFlag {
  kind: ReviewKind
  message: string
}

export interface CarePath {
  lane: string
  route: string
  profile: string
  barriers: string[]
  emergency: boolean
  destination: {
    title: string
    door: string
    // Read aloud or shown at the desk: always Finnish.
    scriptFi: string
    // The same script in the person's language, so they know what they say.
    scriptLocal: string
    note: string
  }
  clocks: PathClock[]
  adaptations: PathAdaptation[]
  steps: PathStep[]
  reviewFlags: ReviewFlag[]
}

export class ComposeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ComposeError'
  }
}

export function ruleFor(doc: ContentDoc, lane: string, route: string): RuleDef {
  const rules = doc.structure.rules
  const rule = rules.find((r) => r.lane === lane && r.route === route) ?? rules.find((r) => r.lane === lane && r.route === null)
  if (!rule) throw new ComposeError(`no rule for lane ${lane}`)
  return rule
}

export function compose(doc: ContentDoc, input: ComposeInput): CarePath {
  const s = doc.structure
  const { lane, route, profile, lang } = input
  if (!s.lanes[lane]) throw new ComposeError(`unknown lane code ${lane}`)
  if (!s.routes[route]) throw new ComposeError(`unknown route code ${route}`)
  if (!s.profiles[profile]) throw new ComposeError(`unknown profile code ${profile}`)
  const barriers = [...new Set(input.barriers)]
  for (const b of barriers) if (!s.barriers[b]) throw new ComposeError(`unknown barrier code ${b}`)

  const t = (key: string) => textOf(doc, key, lang)
  const rule = ruleFor(doc, lane, route)
  const useAlt = !s.routes[route]!.careGuarantee && rule.clocksWithoutCareGuarantee !== null
  const clockSet = useAlt ? 'no_guarantee' : 'clocks'
  const clocks = (useAlt ? rule.clocksWithoutCareGuarantee! : rule.clocks).map((c, i) => ({
    label: t(k.clockKey(rule, clockSet, i, 'label')),
    limit: t(k.clockKey(rule, clockSet, i, 'limit')),
    basis: c.basis,
  }))

  const door = t(k.routeKey(route, 'door'))
  const destination = {
    title: t(k.ruleKey(rule, 'title')).replaceAll('{door}', door),
    door,
    scriptFi: textOf(doc, k.ruleKey(rule, 'script'), 'fi'),
    scriptLocal: t(k.ruleKey(rule, 'script')),
    note: t(k.routeKey(route, 'note')),
  }

  const adaptations: PathAdaptation[] = [
    { code: profile, name: t(k.profileKey(profile, 'name')), how: t(k.profileKey(profile, 'mode')), right: t(k.profileKey(profile, 'right')) },
    ...barriers.map((b) => ({ code: b, name: t(k.barrierKey(b, 'name')), how: t(k.barrierKey(b, 'fix')), right: null })),
  ]

  return {
    lane,
    route,
    profile,
    barriers,
    emergency: lane === 'U0',
    destination,
    clocks,
    adaptations,
    steps: steps(doc, { ...input, barriers }, destination.title),
    reviewFlags: reviewFlags(doc, lane, route),
  }
}

function steps(doc: ContentDoc, input: ComposeInput, title: string): PathStep[] {
  const { lane, route, profile, barriers, lang } = input
  const t = (key: string) => textOf(doc, key, lang)
  const out: PathStep[] = []
  const add = (key: string, detail: string | null = null, adaptation: string | null = null) =>
    out.push({ text: t(key).replaceAll('{title}', title), detail, adaptation })
  const barrierSteps = (stage: string) => {
    for (const b of barriers) {
      if (doc.structure.barriers[b]!.stepStage === stage) {
        out.push({ text: t(k.barrierStepKey(b, 'text')), detail: optionalText(doc, k.barrierStepKey(b, 'detail'), lang), adaptation: b })
      }
    }
  }

  add('step.describe', t(k.profileKey(profile, 'mode')), profile)
  barrierSteps('describe')
  if (lane === 'U0') {
    add('step.emergency')
    return out
  }
  add('step.route', t(k.laneKey(lane, 'tone')))
  if (doc.structure.routes[route]!.extraStep) {
    out.push({ text: t(k.routeExtraKey(route, 'text')), detail: optionalText(doc, k.routeExtraKey(route, 'detail'), lang), adaptation: route })
  }
  barrierSteps('route')
  add('step.contact', t(k.profileKey(profile, 'contact')), profile)
  barrierSteps('contact')
  if (lane === 'U5') {
    add('step.stalled_clock')
    add('step.stalled_escalate')
    return out
  }
  add(lane === 'U4' ? 'step.wait_screening' : 'step.wait')
  barrierSteps('wait')
  add('step.visit', t(k.profileKey(profile, 'visit_card')), profile)
  barrierSteps('visit')
  add('step.followup')
  barrierSteps('followup')
  return out
}

export function reviewFlags(doc: ContentDoc, lane: string, route: string): ReviewFlag[] {
  const flags: ReviewFlag[] = []
  if (doc.structure.lanes[lane]?.needsClinicalReview) {
    flags.push({ kind: 'clinical', message: `Symptom triggers for lane ${lane} need clinical review` })
  }
  if (doc.structure.routes[route]?.needsLegalReview) {
    flags.push({ kind: 'legal', message: `Access rules for route ${route} need legal or county confirmation` })
  }
  return flags
}

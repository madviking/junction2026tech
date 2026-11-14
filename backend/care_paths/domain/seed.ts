// Build a ContentDoc from the seed files (rules.yaml shape + cards + texts).
// Pure: callers pass file contents. Wording moves into `texts` under keys.ts keys.
import { parse } from 'yaml'
import * as k from './keys'
import type {
  Cards,
  ClockDef,
  ContentDoc,
  JourneyDef,
  Lang,
  LanguageDef,
  OutcomeDef,
  ReviewKind,
  RuleDef,
  StageDef,
  Structure,
  Texts,
} from './types'
import { ContentError, LANGS } from './types'

export interface SeedFiles {
  rulesYaml: string
  cardsYaml: string
  // ui/*.yaml: key -> { en, fi?, so?, ar? }
  uiYamls: string[]
  // texts.<lang>.yaml: key -> text (translations of keys defined elsewhere)
  translations: Partial<Record<Lang, string>>
}

type Raw = Record<string, unknown>

export const SEED_LANGUAGES: LanguageDef[] = [
  { code: 'en', name: 'English', dir: 'ltr', placeholder: false, profile: 'C2' },
  { code: 'fi', name: 'Suomi', dir: 'ltr', placeholder: false, profile: 'C1' },
  { code: 'so', name: 'Soomaali', dir: 'ltr', placeholder: true, profile: 'C3' },
  { code: 'ar', name: 'العربية', dir: 'rtl', placeholder: true, profile: 'C2' },
]

const obj = (v: unknown, where: string): Raw => {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) throw seedError(where, 'expected a mapping')
  return v as Raw
}
const str = (v: unknown, where: string): string => {
  if (typeof v !== 'string' && typeof v !== 'number') throw seedError(where, 'expected text')
  return String(v)
}
const optStr = (v: unknown, where: string): string | null => (v === undefined || v === null ? null : str(v, where))
const seedError = (path: string, message: string) => new ContentError([{ severity: 'error', path, message }])
const review = (v: unknown, where: string): ReviewKind | null => {
  if (v === undefined || v === null) return null
  if (v !== 'clinical' && v !== 'legal') throw seedError(where, `unknown review kind ${String(v)}`)
  return v
}

class TextSink {
  readonly texts: Texts = {}
  set(key: string, lang: Lang, text: string | null) {
    if (text === null || text === '') return
    this.texts[key] = { ...this.texts[key], [lang]: { text, review: 'unchecked' } }
  }
}

function clocks(raw: unknown, where: string, keyOf: (i: number, f: 'label' | 'limit') => string, t: TextSink): ClockDef[] {
  if (!Array.isArray(raw)) throw seedError(where, 'expected a list of clocks')
  return raw.map((c, i) => {
    const clock = obj(c, `${where}[${i}]`)
    t.set(keyOf(i, 'label'), 'en', str(clock.label, `${where}[${i}].label`))
    t.set(keyOf(i, 'limit'), 'en', str(clock.limit, `${where}[${i}].limit`))
    return { basis: str(clock.basis, `${where}[${i}].basis`) as ClockDef['basis'] }
  })
}

function parseJourney(raw: Raw, t: TextSink): JourneyDef {
  const interrupts: JourneyDef['interrupts'] = {}
  for (const [id, v] of Object.entries(obj(raw.interrupts, 'journey.interrupts'))) {
    const i = obj(v, `journey.interrupts.${id}`)
    t.set(k.interruptKey(id), 'en', str(i.card, `journey.interrupts.${id}.card`))
    interrupts[id] = { next: str(i.next, `journey.interrupts.${id}.next`) }
  }

  const route = obj(obj(raw.facts, 'journey.facts').route, 'journey.facts.route')
  const questions = (route.questions as unknown[]) ?? []
  questions.forEach((q, i) => t.set(k.routeQuestionKey(i), 'en', str(q, `journey.facts.route.questions[${i}]`)))
  const ifUnknown = obj(route.if_unknown, 'journey.facts.route.if_unknown')
  t.set(k.ROUTE_IF_UNKNOWN_KEY, 'en', str(ifUnknown.then, 'journey.facts.route.if_unknown.then'))

  const stages: Record<string, StageDef> = {}
  for (const [stageId, v] of Object.entries(obj(raw.stages, 'journey.stages'))) {
    const where = `journey.stages.${stageId}`
    const s = obj(v, where)
    if (s.ask !== undefined) t.set(k.stageAskKey(stageId), 'en', str(s.ask, `${where}.ask`))
    const ladder = (s.ladder as unknown[] | undefined) ?? []
    ladder.forEach((rung, i) => t.set(k.ladderKey(stageId, i), 'en', str(rung, `${where}.ladder[${i}]`)))
    const outcomes: Record<string, OutcomeDef> = {}
    for (const [outcomeId, ov] of Object.entries((s.outcomes as Raw | undefined) ?? {})) {
      const ow = `${where}.outcomes.${outcomeId}`
      const o = obj(ov, ow)
      t.set(k.outcomeKey(stageId, outcomeId, 'card'), 'en', str(o.card, `${ow}.card`))
      t.set(k.outcomeKey(stageId, outcomeId, 'then'), 'en', optStr(o.then, `${ow}.then`))
      outcomes[outcomeId] = {
        next: str(o.next, `${ow}.next`),
        sets: (optStr(o.sets, `${ow}.sets`) as OutcomeDef['sets']) ?? null,
        setsLane: optStr(o.sets_lane, `${ow}.sets_lane`),
        records: optStr(o.records, `${ow}.records`),
        maxTries: o.max_tries === undefined ? null : Number(o.max_tries),
        afterMax: optStr(o.after_max, `${ow}.after_max`),
        climb: o.climb === true,
        review: review(o.review, `${ow}.review`),
      }
    }
    const overdue = s.overdue === undefined ? null : obj(s.overdue, `${where}.overdue`)
    stages[stageId] = {
      terminal: s.terminal === true,
      ladder: ladder.length,
      checkIns: ((s.check_ins as unknown[] | undefined) ?? []).map((c, i) => str(c, `${where}.check_ins[${i}]`)),
      overdueNext: overdue ? str(overdue.next, `${where}.overdue.next`) : null,
      outcomes,
    }
  }

  return {
    start: str(raw.start, 'journey.start'),
    interrupts,
    facts: {
      route: {
        askAt: str(route.ask_at, 'journey.facts.route.ask_at'),
        questions: questions.length,
        ifUnknownRoute: str(ifUnknown.use_route, 'journey.facts.route.if_unknown.use_route'),
        ifUnknownReview: review(ifUnknown.review, 'journey.facts.route.if_unknown.review'),
      },
    },
    stages,
  }
}

function parseRules(rulesYaml: string, t: TextSink): Structure {
  const raw = obj(parse(rulesYaml), 'rules.yaml')
  for (const section of ['lanes', 'routes', 'profiles', 'barriers', 'rules', 'journey']) {
    if (raw[section] === undefined) throw seedError(section, 'missing section')
  }

  const lanes: Structure['lanes'] = {}
  for (const [code, v] of Object.entries(obj(raw.lanes, 'lanes'))) {
    const l = obj(v, `lanes.${code}`)
    for (const f of ['name', 'trigger', 'tone'] as const) t.set(k.laneKey(code, f), 'en', str(l[f], `lanes.${code}.${f}`))
    lanes[code] = { needsClinicalReview: l.needs_clinical_review === true }
  }

  const routes: Structure['routes'] = {}
  for (const [code, v] of Object.entries(obj(raw.routes, 'routes'))) {
    const r = obj(v, `routes.${code}`)
    for (const f of ['name', 'who', 'door', 'note'] as const) t.set(k.routeKey(code, f), 'en', str(r[f], `routes.${code}.${f}`))
    const extra = r.extra_step === undefined ? null : obj(r.extra_step, `routes.${code}.extra_step`)
    if (extra) {
      t.set(k.routeExtraKey(code, 'text'), 'en', str(extra.text, `routes.${code}.extra_step.text`))
      t.set(k.routeExtraKey(code, 'detail'), 'en', optStr(extra.detail, `routes.${code}.extra_step.detail`))
    }
    routes[code] = { careGuarantee: r.care_guarantee === true, needsLegalReview: r.needs_legal_review === true, extraStep: extra !== null }
  }

  const profiles: Structure['profiles'] = {}
  for (const [code, v] of Object.entries(obj(raw.profiles, 'profiles'))) {
    const p = obj(v, `profiles.${code}`)
    for (const f of k.PROFILE_FIELDS) t.set(k.profileKey(code, f), 'en', str(p[f], `profiles.${code}.${f}`))
    profiles[code] = {}
  }

  const barriers: Structure['barriers'] = {}
  for (const [code, v] of Object.entries(obj(raw.barriers, 'barriers'))) {
    const b = obj(v, `barriers.${code}`)
    for (const f of k.BARRIER_FIELDS) t.set(k.barrierKey(code, f), 'en', str(b[f], `barriers.${code}.${f}`))
    const step = b.step === undefined ? null : obj(b.step, `barriers.${code}.step`)
    if (step) {
      t.set(k.barrierStepKey(code, 'text'), 'en', str(step.text, `barriers.${code}.step.text`))
      t.set(k.barrierStepKey(code, 'detail'), 'en', optStr(step.detail, `barriers.${code}.step.detail`))
    }
    barriers[code] = { stepStage: step ? str(step.stage, `barriers.${code}.step.stage`) : null }
  }

  if (!Array.isArray(raw.rules)) throw seedError('rules', 'expected a list')
  const rules: RuleDef[] = raw.rules.map((v, i) => {
    const r = obj(v, `rules[${i}]`)
    const id = { lane: str(r.lane, `rules[${i}].lane`), route: optStr(r.route, `rules[${i}].route`) }
    t.set(k.ruleKey(id, 'title'), 'en', str(r.title, `rules[${i}].title`))
    t.set(k.ruleKey(id, 'script'), 'fi', str(r.script_fi, `rules[${i}].script_fi`))
    const alt = r.clocks_without_care_guarantee
    return {
      ...id,
      clocks: clocks(r.clocks, `rules[${i}].clocks`, (n, f) => k.clockKey(id, 'clocks', n, f), t),
      clocksWithoutCareGuarantee:
        alt === undefined ? null : clocks(alt, `rules[${i}].clocks_without_care_guarantee`, (n, f) => k.clockKey(id, 'no_guarantee', n, f), t),
    }
  })

  return { lanes, routes, profiles, barriers, rules, journey: parseJourney(obj(raw.journey, 'journey'), t) }
}

function parseCards(cardsYaml: string, t: TextSink): Cards {
  const raw = obj(parse(cardsYaml), 'cards.yaml')
  const symptoms = ((raw.symptoms as unknown[]) ?? []).map((v, i) => {
    const c = obj(v, `symptoms[${i}]`)
    const id = str(c.id, `symptoms[${i}].id`)
    t.set(k.symptomKey(id, 'card'), 'en', str(c.card, `symptoms[${i}].card`))
    t.set(k.symptomKey(id, 'detail'), 'en', optStr(c.detail, `symptoms[${i}].detail`))
    return { id, lane: str(c.lane, `symptoms[${i}].lane`) }
  })
  const emergencySigns = Object.entries(obj(raw.emergency_signs, 'emergency_signs')).map(([id, text]) => {
    t.set(k.emergencySignKey(id), 'en', str(text, `emergency_signs.${id}`))
    return id
  })
  for (const [code, text] of Object.entries(obj(raw.route_cards, 'route_cards'))) {
    t.set(k.routeKey(code, 'card'), 'en', str(text, `route_cards.${code}`))
  }
  const clinicianRaw = obj(raw.clinician, 'clinician')
  const clinician = Object.entries(obj(clinicianRaw.cards, 'clinician.cards')).map(([outcome, next]) => {
    t.set(k.clinicianNextKey(outcome), 'en', str(next, `clinician.cards.${outcome}`))
    return { outcome }
  })
  return { symptoms, emergencySigns, clinicianStage: str(clinicianRaw.stage, 'clinician.stage'), clinician }
}

function parseUi(uiYaml: string, t: TextSink, file: number) {
  for (const [key, v] of Object.entries(obj(parse(uiYaml) ?? {}, `ui[${file}]`))) {
    if (!k.isFreeKey(key)) throw seedError(`ui[${file}].${key}`, 'ui seed keys must start with ui. or step.')
    const entry = obj(v, `ui[${file}].${key}`)
    // An unquoted comma inside a flow mapping ({en: a, b}) silently creates extra keys.
    const unknown = Object.keys(entry).filter((l) => !(LANGS as readonly string[]).includes(l))
    if (unknown.length) throw seedError(`ui[${file}].${key}`, `unknown language keys ${unknown.join(', ')} (quote texts that contain commas)`)
    for (const lang of LANGS) t.set(key, lang, optStr(entry[lang], `ui[${file}].${key}.${lang}`))
  }
}

export function buildSeedDoc(files: SeedFiles): ContentDoc {
  const t = new TextSink()
  const structure = parseRules(files.rulesYaml, t)
  const cards = parseCards(files.cardsYaml, t)
  files.uiYamls.forEach((y, i) => parseUi(y, t, i))
  for (const lang of LANGS) {
    const yaml = files.translations[lang]
    if (!yaml) continue
    for (const [key, text] of Object.entries(obj(parse(yaml) ?? {}, `texts.${lang}.yaml`))) {
      t.set(key, lang, optStr(text, `texts.${lang}.yaml.${key}`))
    }
  }
  return { schemaVersion: 1, languages: SEED_LANGUAGES, structure, cards, texts: t.texts }
}

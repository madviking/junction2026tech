// Service-path stage catalogue and closed code lists. Pure, no I/O, no Encore imports.
// Stages and their limits are national: an area never changes them (design rule 1 in
// docs/planning/2026-11-14-service-paths.md). Sources: Health Care Act §50–52,
// STM 2010:6 (junction2026 brain sources/2026-11-13-web-research-service-paths.md §4).

// Literal unions written out: the Encore type parser does not support typeof X[number].
export type StageCode =
  | 'contact'
  | 'assessment'
  | 'primary_visit'
  | 'referral_processing'
  | 'specialist_first_visit'
  | 'diagnostics'
  | 'treatment_start'
  | 'screening_invitation'
  | 'screening_result'
  | 'screening_followup'

export type LimitBasis = 'legal' | 'recommended' | 'open'

export interface StageLimit {
  label: string
  limit: string
  basis: LimitBasis
  ref: string
}

export interface Stage {
  code: StageCode
  // Journey stage in care_paths this stage belongs to (CARE_STEP_STAGES).
  journeyStage: string
  name: string
  limits: StageLimit[]
}

const HCA = 'Health Care Act 1326/2010'
const STM = 'STM 2010:6 cancer care targets (non-binding)'

export const STAGES: readonly Stage[] = [
  {
    code: 'contact',
    journeyStage: 'contact',
    name: 'First contact',
    limits: [{ label: 'Reach the health centre', limit: 'same weekday, office hours', basis: 'legal', ref: `${HCA} §51` }],
  },
  {
    code: 'assessment',
    journeyStage: 'contact',
    name: 'Needs assessment',
    limits: [{ label: 'Assessment of need', limit: 'by the 3rd weekday', basis: 'legal', ref: `${HCA} §51` }],
  },
  {
    code: 'primary_visit',
    journeyStage: 'wait',
    name: 'Primary-care visit',
    limits: [
      { label: 'Non-urgent visit (23+)', limit: '3 months from assessment', basis: 'legal', ref: `${HCA} §51 a` },
      { label: 'Non-urgent visit (under 23)', limit: '14 days from assessment', basis: 'legal', ref: `${HCA} §51 a` },
    ],
  },
  {
    code: 'referral_processing',
    journeyStage: 'followup',
    name: 'Referral processed',
    limits: [{ label: 'Referral assessed', limit: '3 weeks from arrival', basis: 'legal', ref: `${HCA} §52` }],
  },
  {
    code: 'specialist_first_visit',
    journeyStage: 'followup',
    name: 'Specialist first visit',
    limits: [{ label: 'Assessment when tests are needed', limit: '3 months from referral', basis: 'legal', ref: `${HCA} §52` }],
  },
  {
    code: 'diagnostics',
    journeyStage: 'followup',
    name: 'Imaging and pathology',
    limits: [{ label: 'Imaging and tissue samples', limit: '1 week', basis: 'recommended', ref: STM }],
  },
  {
    code: 'treatment_start',
    journeyStage: 'followup',
    name: 'Diagnosis and treatment start',
    limits: [
      { label: 'Suspected cancer, referral to treatment', limit: '6 weeks', basis: 'recommended', ref: STM },
      { label: 'Non-urgent specialist treatment', limit: '6 months from need established', basis: 'legal', ref: `${HCA} §52` },
    ],
  },
  {
    code: 'screening_invitation',
    journeyStage: 'describe',
    name: 'Screening invitation',
    limits: [{ label: 'Invitation', limit: 'programme interval', basis: 'open', ref: 'Government decree 339/2011' }],
  },
  {
    code: 'screening_result',
    journeyStage: 'wait',
    name: 'Screening result',
    limits: [{ label: 'Result', limit: 'no legal limit', basis: 'open', ref: 'Government decree 339/2011' }],
  },
  {
    code: 'screening_followup',
    journeyStage: 'followup',
    name: 'Follow-up after a positive screen',
    limits: [{ label: 'Positive result', limit: 'chase like an alarm symptom', basis: 'recommended', ref: 'Silta guidance' }],
  },
]

export const STAGE_CODES: readonly StageCode[] = STAGES.map((s) => s.code)

export type PointKind =
  | 'health_station'
  | 'phone_service'
  | 'digital_service'
  | 'after_hours'
  | 'emergency'
  | 'specialist_hospital'
  | 'cancer_centre'
  | 'screening_provider'
  | 'screening_nurse'
  | 'occupational'
  | 'student'
  | 'reception_centre'
  | 'volunteer_clinic'
  | 'private'

export const POINT_KINDS: readonly PointKind[] = [
  'health_station',
  'phone_service',
  'digital_service',
  'after_hours',
  'emergency',
  'specialist_hospital',
  'cancer_centre',
  'screening_provider',
  'screening_nurse',
  'occupational',
  'student',
  'reception_centre',
  'volunteer_clinic',
  'private',
]

// care_paths route codes (rules.yaml `routes`).
export const ROUTE_CODES: readonly string[] = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8']
// care_paths barrier codes (rules.yaml `barriers`).
export const BARRIER_CODES: readonly string[] = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10']

export type FactStatus = 'draft' | 'published' | 'disputed' | 'stale'
export const FACT_STATUSES: readonly FactStatus[] = ['draft', 'published', 'disputed', 'stale']

export type InformedBy = 'letter' | 'portal' | 'sms' | 'phone' | 'in_person'
export const INFORMED_BY: readonly InformedBy[] = ['letter', 'portal', 'sms', 'phone', 'in_person']

export type Cancer = 'breast' | 'cervical' | 'colorectal'
export const CANCERS: readonly Cancer[] = ['breast', 'cervical', 'colorectal']

export type Better = 'lower' | 'higher'
export type MetricScope = 'area' | 'hospital_district' | 'national'
export const METRIC_SCOPES: readonly MetricScope[] = ['area', 'hospital_district', 'national']

// Whole Finland as a metric baseline; not a county row.
export const FINLAND = 'finland'

export function stageOf(code: string): Stage | undefined {
  return STAGES.find((s) => s.code === code)
}

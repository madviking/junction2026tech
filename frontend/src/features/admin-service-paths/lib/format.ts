import type { SelectOption } from '@/shared/ui'
import type { FactStatus, InformedBy, PointKind } from '@/features/admin-service-paths/types'

export const STATUS_TONE: Record<FactStatus, 'success' | 'neutral' | 'warning' | 'danger'> = {
  published: 'success',
  draft: 'neutral',
  disputed: 'warning',
  stale: 'danger',
}

export const STATUS_FILTERS: SelectOption[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'disputed', label: 'Disputed' },
  { value: 'stale', label: 'Stale' },
]

const KIND_LABELS: Record<PointKind, string> = {
  health_station: 'Health station',
  phone_service: 'Phone service',
  digital_service: 'Digital service',
  after_hours: 'After hours (116117)',
  emergency: 'Emergency department',
  specialist_hospital: 'Specialist hospital',
  cancer_centre: 'Cancer care',
  screening_provider: 'Screening provider',
  screening_nurse: 'Screening nurse',
  occupational: 'Occupational health',
  student: 'Student health',
  reception_centre: 'Reception centre',
  volunteer_clinic: 'Volunteer clinic',
  private: 'Private clinic',
}

export const kindLabel = (k: PointKind) => KIND_LABELS[k] ?? k
export const KIND_OPTIONS: SelectOption[] = Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label }))

const INFORMED_LABELS: Record<InformedBy, string> = {
  letter: 'Letter',
  portal: 'Portal',
  sms: 'Text message',
  phone: 'Phone',
  in_person: 'In person',
}

export const informedLabel = (v: InformedBy | null) => (v ? INFORMED_LABELS[v] : '')
export const INFORMED_OPTIONS: SelectOption[] = Object.entries(INFORMED_LABELS).map(([value, label]) => ({ value, label }))

/** care_paths access routes (rules.yaml). */
export const ROUTES: { code: string; label: string }[] = [
  { code: 'A1', label: 'A1 Resident' },
  { code: 'A2', label: 'A2 Occupational' },
  { code: 'A3', label: 'A3 Student' },
  { code: 'A4', label: 'A4 Private' },
  { code: 'A5', label: 'A5 Temporary protection' },
  { code: 'A6', label: 'A6 Asylum seeker' },
  { code: 'A7', label: 'A7 Undocumented' },
  { code: 'A8', label: 'A8 EU/Nordic' },
]

/** care_paths barriers (rules.yaml). */
export const BARRIER_OPTIONS: SelectOption[] = (
  [
    ['B1', 'Cost'],
    ['B2', 'Time, work'],
    ['B3', 'Distance'],
    ['B4', 'Distrust'],
    ['B5', 'Stigma'],
    ['B6', 'Gender or modesty'],
    ['B7', 'Child or family interprets'],
    ['B8', 'Status fear'],
    ['B9', 'Care duties'],
    ['B10', 'Anxiety, overload'],
  ] as [string, string][]
).map(([value, label]) => ({ value, label: `${value} ${label}` }))

export const TRI_STATE: SelectOption[] = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

export const toTri = (v: boolean | null): string => (v === null ? 'unknown' : v ? 'yes' : 'no')
export const fromTri = (v: string | null): boolean | null => (v === 'yes' ? true : v === 'no' ? false : null)

/** Empty text → null, so "unknown" stays unknown in the database. */
export const orNull = (v: string): string | null => (v.trim() ? v.trim() : null)

export const listText = (v: string[] | null) => (v ?? []).join(', ')
export const textList = (v: string): string[] | null => {
  const items = v
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
  return items.length ? items : null
}

export const today = () => new Date().toISOString().slice(0, 10)

export function formatValue(value: number | null, unit: string): string {
  if (value === null) return 'not published'
  const n = Number.isInteger(value) ? String(value) : value.toFixed(1)
  return unit === '%' ? `${n} %` : `${n} ${unit}`
}

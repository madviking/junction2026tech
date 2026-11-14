import { vi } from 'vitest'
import type { AdminAreaView, AreaSummary, CompareView, Stage } from '@/features/admin-service-paths/types'

const source = { id: 7, url: 'https://kymenhva.fi/syopa', title: 'Syöpä', publisher: 'Kymenlaakson hyvinvointialue', capturedOn: '2026-11-14' }

export const stages: Stage[] = [
  {
    code: 'contact',
    journeyStage: 'contact',
    name: 'First contact',
    limits: [{ label: 'Reach the health centre', limit: 'same weekday, office hours', basis: 'legal', ref: 'HCA §51' }],
  },
  {
    code: 'screening_followup',
    journeyStage: 'followup',
    name: 'Follow-up after a positive screen',
    limits: [{ label: 'Positive result', limit: 'chase like an alarm symptom', basis: 'recommended', ref: 'Silta' }],
  },
]

export const areas: AreaSummary[] = [
  {
    id: 'kymenlaakso',
    name: 'Kymenlaakson hyvinvointialue / Kymenlaakso',
    specialistProvider: 'Kymenlaakson keskussairaala',
    collaborationArea: null,
    sotkanetRegionId: 967,
    counts: { draft: 4, published: 11, disputed: 1, stale: 0 },
  },
  {
    id: 'helsinki',
    name: 'Helsingin kaupunki / City of Helsinki',
    specialistProvider: 'HUS',
    collaborationArea: 'HUS yhteistyöalue',
    sotkanetRegionId: 960,
    counts: { draft: 1, published: 17, disputed: 0, stale: 0 },
  },
]

const base = { status: 'published' as const, verifiedOn: '2026-11-14', source }

export const area: AdminAreaView = {
  area: areas[0]!,
  stages,
  points: [
    {
      id: 11,
      county: 'kymenlaakso',
      key: 'screening-nurse',
      kind: 'screening_nurse',
      routes: ['A1'],
      nameFi: 'Seulontahoitaja',
      nameEn: 'Screening nurse',
      city: 'Kotka',
      phone: '040 688 3831',
      hours: 'Fri 9–11, 12–14',
      contactNote: null,
      callback: null,
      walkIn: null,
      digitalChannel: null,
      digitalLogin: null,
      serviceLanguages: null,
      interpreterHow: null,
      feeNote: null,
      url: null,
      updatedBy: 'seed',
      ...base,
    },
    {
      id: 12,
      county: 'kymenlaakso',
      key: 'private',
      kind: 'private',
      routes: ['A4'],
      nameFi: 'Terveystalo',
      nameEn: null,
      city: null,
      phone: null,
      hours: null,
      contactNote: null,
      callback: null,
      walkIn: null,
      digitalChannel: null,
      digitalLogin: null,
      serviceLanguages: null,
      interpreterHow: null,
      feeNote: null,
      url: null,
      updatedBy: 'seed',
      status: 'draft',
      verifiedOn: null,
      source: null,
    },
  ],
  steps: [
    {
      county: 'kymenlaakso',
      stage: 'screening_followup',
      pointId: 11,
      pointName: 'Seulontahoitaja',
      informedBy: 'phone',
      portal: null,
      ifNothingHeard: 'Call on Friday',
      ...base,
    },
  ],
  screening: [
    {
      county: 'kymenlaakso',
      cancer: 'colorectal',
      ages: '60–70',
      provider: 'HUS',
      invitationChannel: 'letter',
      infoLanguages: ['fi'],
      followupPointId: 11,
      followupPointName: 'Seulontahoitaja',
      selfSampling: null,
      ...base,
    },
  ],
  metrics: [
    {
      id: 21,
      area: 'kymenlaakso',
      stage: 'screening_followup',
      metric: 'cancer_registry:fit_no_colonoscopy',
      definition: 'Positive FIT without a programme colonoscopy',
      value: 37.9,
      unit: '%',
      period: '2024',
      better: 'lower',
      scope: 'area',
      status: 'published',
      source,
    },
  ],
  findings: [
    {
      id: 31,
      county: 'kymenlaakso',
      key: 'friday-nurse',
      stage: 'screening_followup',
      barrier: 'B2',
      finding: 'The nurse line is open only on Fridays.',
      ...base,
    },
  ],
  sources: [{ ...source, brainRef: 'sources/2026-11-14-web-research-service-paths-kymenlaakso.md' }],
}

export const compare: CompareView = {
  areas: areas.map((a) => ({ id: a.id, name: a.name })),
  stages,
  metrics: [
    {
      metric: 'sotkanet:6411',
      stage: 'contact',
      definition: 'Doctor visits waiting over 7 days',
      unit: '%',
      better: 'lower',
      period: '2025',
      finland: { area: 'finland', value: 54.7, period: '2025', scope: 'national', vsFinland: null, source },
      cells: [
        { area: 'kymenlaakso', value: 61.8, period: '2025', scope: 'area', vsFinland: 'worse', source },
        { area: 'helsinki', value: null, period: null, scope: null, vsFinland: null, source: null },
      ],
    },
  ],
  steps: [
    {
      stage: 'screening_followup',
      cells: [
        { area: 'kymenlaakso', pointName: 'Seulontahoitaja', informedBy: 'phone', ifNothingHeard: 'Call on Friday', source },
        { area: 'helsinki', pointName: null, informedBy: null, ifNothingHeard: null, source: null },
      ],
    },
  ],
}

type Handler = (url: URL, init: RequestInit) => Response

/** Stubs fetch by "METHOD /path"; unknown calls get 404. */
export function stubApi(handlers: Record<string, Handler>) {
  const spy = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input))
    const handler = handlers[`${init.method ?? 'GET'} ${url.pathname}`]
    return handler ? handler(url, init) : Response.json({ code: 'not_found', message: 'no stub' }, { status: 404 })
  })
  vi.stubGlobal('fetch', spy)
  return spy
}

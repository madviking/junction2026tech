// Service paths against Encore's test database (migration 10 + seed, no mocks).
// Authenticated calls cannot go through the gateway in tests, so admin rules are tested
// through admin_service.ts and the endpoints for rejecting anonymous calls.
import { describe, expect, it } from 'vitest'
import { listAudit } from '../admin/repository'
import {
  adminAddSource,
  adminArea,
  adminSaveFinding,
  adminSaveMetric,
  adminSavePoint,
  adminSaveScreening,
  adminSaveStep,
  adminSetStatus,
} from './admin'
import * as svc from './admin_service'
import { area, areas, compare, stages } from './service_paths'

const ACTOR = 'service-paths-test@example.test'
const AREAS = ['etela-pohjanmaa', 'helsinki', 'kymenlaakso', 'lansi-uusimaa', 'pohjois-pohjanmaa']

describe('public endpoints', () => {
  it('list the five areas with published facts', async () => {
    const { areas: list } = await areas()
    expect(list.map((a) => a.id).sort()).toEqual(AREAS)
    for (const a of list) expect(a.counts.published, a.id).toBeGreaterThan(0)
    expect(list.find((a) => a.id === 'kymenlaakso')?.sotkanetRegionId).toBe(967)
  })

  it('show only published rows, each with a source', async () => {
    const k = await area({ id: 'kymenlaakso' })
    for (const rows of [k.points, k.steps, k.screening, k.metrics, k.findings]) {
      expect(rows.length).toBeGreaterThan(0)
      expect(rows.every((r) => r.status === 'published')).toBe(true)
    }
    expect(k.points.every((p) => p.source !== null && p.verifiedOn !== null)).toBe(true)
    const colorectal = k.screening.find((s) => s.cancer === 'colorectal')
    expect(colorectal?.followupPointName).toBeTruthy()
    expect(k.metrics.find((m) => m.metric === 'cancer_registry:fit_no_colonoscopy' && m.period === '2024')?.value).toBe(37.9)
  })

  it('give every area the same stages and limits (area never changes the clock)', async () => {
    const all = await Promise.all(AREAS.map((id) => area({ id })))
    for (const a of all) expect(a.stages).toEqual(all[0].stages)
    expect(all[0].stages).toEqual((await stages()).stages)
  })

  it('filter doors by access route', async () => {
    const h = await area({ id: 'helsinki', route: 'A1' })
    expect(h.points.length).toBeGreaterThan(0)
    expect(h.points.every((p) => p.routes.includes('A1'))).toBe(true)
  })

  it('compare areas against Finland stage by stage', async () => {
    const c = await compare()
    expect(c.areas.map((a) => a.id).sort()).toEqual(AREAS)
    const wait = c.metrics.find((m) => m.metric === 'sotkanet:6411')!
    expect(wait.period).toBe('2025')
    expect(wait.finland.value).toBe(54.7)
    expect(wait.cells.find((x) => x.area === 'helsinki')).toMatchObject({ value: 75.9, vsFinland: 'worse' })
    expect(wait.cells.find((x) => x.area === 'lansi-uusimaa')).toMatchObject({ value: 40, vsFinland: 'better' })
    const fit = c.metrics.find((m) => m.metric === 'cancer_registry:fit_no_colonoscopy')!
    expect(fit.cells.find((x) => x.area === 'etela-pohjanmaa')?.value).toBe(18.2)
    // LUVN has no published specialist >6-month figure: shown as missing, not zero.
    expect(c.metrics.find((m) => m.metric === 'sotkanet:3336')?.cells.find((x) => x.area === 'lansi-uusimaa')).toMatchObject({ value: null })
    expect(c.steps.some((s) => s.stage === 'screening_followup')).toBe(true)
  })

  it('unknown area → not found', async () => {
    await expect(area({ id: 'atlantis' })).rejects.toMatchObject({ code: 'not_found' })
  })
})

describe('admin endpoints', () => {
  it('reject anonymous calls', async () => {
    const calls: [string, () => Promise<unknown>][] = [
      ['area', () => adminArea({ id: 'helsinki' })],
      ['point', () => adminSavePoint({} as never)],
      ['step', () => adminSaveStep({} as never)],
      ['screening', () => adminSaveScreening({} as never)],
      ['metric', () => adminSaveMetric({} as never)],
      ['finding', () => adminSaveFinding({} as never)],
      ['source', () => adminAddSource({} as never)],
      ['status', () => adminSetStatus({ kind: 'point', id: 1, status: 'draft' })],
    ]
    for (const [name, call] of calls) await expect(call(), name).rejects.toMatchObject({ code: 'unauthenticated' })
  })
})

describe('admin rules', () => {
  const point = {
    id: null,
    county: 'kymenlaakso',
    key: `test-door-${Date.now()}`,
    kind: 'volunteer_clinic' as const,
    routes: ['A7'],
    nameFi: 'Testiklinikka',
    nameEn: 'Test clinic',
    city: 'Kotka',
    phone: null,
    hours: null,
    contactNote: null,
    callback: null,
    walkIn: null,
    digitalChannel: null,
    digitalLogin: null,
    serviceLanguages: ['fi', 'en'],
    interpreterHow: null,
    feeNote: null,
    url: null,
    status: 'draft' as const,
    verifiedOn: null,
    sourceId: null,
  }

  it('a draft door shows in the admin view only, then publishes with a source and verify', async () => {
    const id = await svc.savePoint(ACTOR, point)
    const adminView = await svc.adminArea('kymenlaakso')
    expect(adminView.points.find((p) => p.id === id)).toMatchObject({ status: 'draft', serviceLanguages: ['fi', 'en'], updatedBy: ACTOR })
    expect((await area({ id: 'kymenlaakso' })).points.some((p) => p.id === id)).toBe(false)

    // No source yet: publishing is refused.
    await expect(svc.setStatus(ACTOR, { kind: 'point', id }, 'published', true)).rejects.toMatchObject({ code: 'invalid_argument' })

    const sourceId = await svc.addSource(ACTOR, { url: 'https://example.test/clinic', title: 'Test clinic page', publisher: 'Test', capturedOn: '2026-11-14', brainRef: null })
    await svc.savePoint(ACTOR, { ...point, id, sourceId })
    await svc.setStatus(ACTOR, { kind: 'point', id }, 'published', true)
    const pub = (await area({ id: 'kymenlaakso', route: 'A7' })).points.find((p) => p.id === id)
    expect(pub?.status).toBe('published')
    expect(pub?.source?.url).toBe('https://example.test/clinic')
    expect(pub?.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const audit = await listAudit(20)
    expect(audit.some((a) => a.actor === ACTOR && a.action === 'service_paths.point.status')).toBe(true)
  })

  it('refuses unknown codes and a published row without a check date', async () => {
    await expect(svc.savePoint(ACTOR, { ...point, kind: 'teleport' as never })).rejects.toMatchObject({ code: 'invalid_argument' })
    await expect(svc.savePoint(ACTOR, { ...point, routes: ['A9'] })).rejects.toMatchObject({ code: 'invalid_argument' })
    await expect(svc.savePoint(ACTOR, { ...point, status: 'published', sourceId: 1 })).rejects.toMatchObject({ code: 'invalid_argument' })
    await expect(svc.savePoint(ACTOR, { ...point, county: 'atlantis' })).rejects.toMatchObject({ code: 'not_found' })
    await expect(
      svc.saveStep(ACTOR, { county: 'kymenlaakso', stage: 'nowhere' as never, pointId: null, informedBy: null, portal: null, ifNothingHeard: null, status: 'draft', verifiedOn: null, sourceId: null }),
    ).rejects.toMatchObject({ code: 'invalid_argument' })
  })

  it('a metric edit replaces the value for that area, metric and period', async () => {
    const before = (await svc.adminArea('kymenlaakso')).metrics.find((m) => m.metric === 'sotkanet:6411' && m.period === '2025')!
    await svc.saveMetric(ACTOR, { area: 'kymenlaakso', stage: 'primary_visit', metric: 'sotkanet:6411', definition: before.definition, value: 61.9, unit: '%', period: '2025', better: 'lower', scope: 'area', status: 'published', sourceId: before.source.id })
    const after = (await svc.adminArea('kymenlaakso')).metrics.filter((m) => m.metric === 'sotkanet:6411' && m.period === '2025')
    expect(after).toHaveLength(1)
    expect(after[0].value).toBe(61.9)
    await svc.saveMetric(ACTOR, { area: 'kymenlaakso', stage: 'primary_visit', metric: 'sotkanet:6411', definition: before.definition, value: before.value, unit: '%', period: '2025', better: 'lower', scope: 'area', status: 'published', sourceId: before.source.id })
  })
})

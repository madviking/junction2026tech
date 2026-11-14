// Seed parsing and validation (pure, no database).
import { describe, expect, it } from 'vitest'
import { parseAreaSeed, parseMetricsSeed } from './seed'

const AREA = `
county: testland
name: Testlandin hyvinvointialue
specialist_provider: Testland central hospital
collaboration_area: Test yhteistyöalue
sotkanet_region_id: 999
sources:
  contact:
    url: https://example.test/contact
    title: Contacting the health station
    publisher: Testland
    captured_on: 2026-11-14
    brain_ref: sources/2026-11-14-test.md
points:
  - key: booking
    kind: phone_service
    routes: [A1, A8]
    name_fi: Ajanvaraus
    name_en: Booking line
    phone: 05 000 0000
    hours: Mon–Fri 7–20
    contact_note: One number for all stations
    callback: true
    service_languages: [fi, sv]
    status: published
    verified_on: 2026-11-14
    source: contact
  - key: nurse
    kind: screening_nurse
    routes: [A1]
    name_fi: Seulontahoitaja
    status: draft
    source: contact
steps:
  - stage: contact
    point: booking
    informed_by: phone
    status: published
    verified_on: 2026-11-14
    source: contact
screening:
  - cancer: colorectal
    ages: 60–74
    provider: Test lab
    invitation_channel: letter
    info_languages: [fi]
    followup_point: nurse
    self_sampling: false
    status: published
    verified_on: 2026-11-14
    source: contact
findings:
  - key: friday-nurse
    stage: screening_followup
    barrier: B2
    finding: Positive results must phone a nurse line open only on Fridays.
    status: published
    source: contact
`

describe('parseAreaSeed', () => {
  it('reads a valid area into camelCase records', () => {
    const { seed, errors } = parseAreaSeed(AREA, 'testland.yaml')
    expect(errors).toEqual([])
    expect(seed.county).toBe('testland')
    expect(seed.sotkanetRegionId).toBe(999)
    expect(seed.sources[0]).toMatchObject({ key: 'contact', capturedOn: '2026-11-14', brainRef: 'sources/2026-11-14-test.md' })
    expect(seed.points[0]).toMatchObject({ key: 'booking', kind: 'phone_service', routes: ['A1', 'A8'], callback: true, walkIn: null, contactNote: 'One number for all stations' })
    expect(seed.points[1]).toMatchObject({ status: 'draft', verifiedOn: null, nameEn: null })
    expect(seed.steps[0]).toMatchObject({ stage: 'contact', point: 'booking', informedBy: 'phone' })
    expect(seed.screening[0]).toMatchObject({ cancer: 'colorectal', followupPoint: 'nurse', selfSampling: false })
    expect(seed.findings[0]).toMatchObject({ key: 'friday-nurse', barrier: 'B2' })
  })

  it('reports unknown codes, broken references and duplicates', () => {
    const bad = AREA.replace('kind: phone_service', 'kind: teleport')
      .replace('routes: [A1, A8]', 'routes: [A1, A9]')
      .replace('stage: contact\n    point: booking', 'stage: nowhere\n    point: missing')
      .replace('followup_point: nurse', 'followup_point: ghost')
      .replace('source: contact\n  - key: nurse', 'source: nosuch\n  - key: booking')
    const { errors } = parseAreaSeed(bad, 'bad.yaml')
    const text = errors.join('\n')
    expect(text).toContain('kind "teleport"')
    expect(text).toContain('route "A9"')
    expect(text).toContain('stage "nowhere"')
    expect(text).toContain('point "missing"')
    expect(text).toContain('followup_point "ghost"')
    expect(text).toContain('source "nosuch"')
    expect(text).toContain('duplicate point key "booking"')
    expect(errors.every((e) => e.startsWith('bad.yaml:'))).toBe(true)
  })

  it('a published row needs a source and verified_on', () => {
    const bad = AREA.replace('    status: published\n    verified_on: 2026-11-14\n    source: contact\n  - key: nurse', '    status: published\n    source: contact\n  - key: nurse')
    const { errors } = parseAreaSeed(bad, 'x.yaml')
    expect(errors.join('\n')).toContain('points[0] "booking": published needs verified_on')
  })

  it('refuses a source without https url', () => {
    const { errors } = parseAreaSeed(AREA.replace('https://example.test/contact', 'ftp://x'), 'x.yaml')
    expect(errors.join('\n')).toContain('url must start with https://')
  })
})

const METRICS = `
sources:
  sotkanet-6411:
    url: https://sotkanet.fi/rest/1.1/json?indicator=6411&years=2025&genders=total
    title: Sotkanet 6411
    publisher: THL / Sotkanet
    captured_on: 2026-11-14
metrics:
  - area: testland
    stage: primary_visit
    metric: sotkanet:6411
    definition: Share of non-urgent doctor visits waiting over 7 days from the needs assessment
    value: 61.8
    unit: '%'
    period: '2025'
    better: lower
    scope: area
    status: published
    source: sotkanet-6411
  - area: finland
    stage: primary_visit
    metric: sotkanet:6411
    definition: Share of non-urgent doctor visits waiting over 7 days from the needs assessment
    value: 54.7
    unit: '%'
    period: '2025'
    better: lower
    scope: national
    status: published
    source: sotkanet-6411
`

describe('parseMetricsSeed', () => {
  it('reads metrics with Finland as a baseline area', () => {
    const { seed, errors } = parseMetricsSeed(METRICS, 'metrics.yaml', ['testland'])
    expect(errors).toEqual([])
    expect(seed.metrics).toHaveLength(2)
    expect(seed.metrics[1]).toMatchObject({ area: 'finland', value: 54.7, period: '2025', scope: 'national' })
  })

  it('reports unknown areas, non-numeric values and duplicate area+metric+period', () => {
    const bad = METRICS.replace('area: testland', 'area: atlantis').replace('value: 54.7', 'value: lots') + METRICS.split('metrics:\n')[1]
    const { errors } = parseMetricsSeed(bad, 'm.yaml', ['testland'])
    const text = errors.join('\n')
    expect(text).toContain('area "atlantis"')
    expect(text).toContain('value must be a number')
    expect(text).toContain('duplicate metric finland sotkanet:6411 2025')
  })
})

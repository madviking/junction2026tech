import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAdminSession, setAdminSession } from '@/features/admin-auth'
import { AreaPage } from '@/features/admin-service-paths/AreaPage'
import { ServicePathsPage } from '@/features/admin-service-paths/ServicePathsPage'
import { area, areas, compare, stubApi } from '@/features/admin-service-paths/__fixtures__/data'
import { renderWithProviders } from '@/test/render'

function renderRoutes(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/service-paths" element={<ServicePathsPage />} />
      <Route path="/admin/service-paths/:id" element={<AreaPage />} />
    </Routes>,
    { route },
  )
}

const ok = (body: unknown) => () => Response.json(body)

describe('admin service paths', () => {
  beforeEach(() => {
    setAdminSession({ token: 't', expiresAt: new Date(Date.now() + 3_600_000).toISOString(), user: { id: 1, email: 'a@example.test', displayName: 'A' } })
  })
  afterEach(() => {
    clearAdminSession()
    vi.unstubAllGlobals()
  })

  it('lists areas and opens an area', async () => {
    stubApi({ 'GET /api/service-paths/areas': ok({ areas }), 'GET /api/service-paths/admin/areas/kymenlaakso': ok(area) })
    renderRoutes('/admin/service-paths')
    const table = await screen.findByRole('table', { name: 'Areas' })
    expect(within(table).getByText('1 disputed')).toBeInTheDocument()
    fireEvent.click(within(table).getByText('Kymenlaakson hyvinvointialue / Kymenlaakso'))
    expect(await screen.findByRole('heading', { name: 'Kymenlaakson hyvinvointialue / Kymenlaakso' })).toBeInTheDocument()
    expect(screen.getByText('Seulontahoitaja')).toBeInTheDocument()
  })

  it('compares areas against Finland and says when a value is not published', async () => {
    stubApi({ 'GET /api/service-paths/areas': ok({ areas }), 'GET /api/service-paths/compare': ok(compare) })
    renderRoutes('/admin/service-paths')
    fireEvent.click(await screen.findByRole('tab', { name: 'Compare' }))
    const values = await screen.findByRole('table', { name: 'Measured values by area' })
    expect(within(values).getByText('61.8 %')).toBeInTheDocument()
    expect(within(values).getByText('54.7 %')).toBeInTheDocument()
    expect(within(values).getByText('not published')).toBeInTheDocument()
    const steps = screen.getByRole('table', { name: 'Steps by area' })
    expect(within(steps).getByText('Seulontahoitaja · Phone')).toBeInTheDocument()
    expect(within(steps).getByText('not mapped')).toBeInTheDocument()
  })

  it('publishes a draft door with today as the check date', async () => {
    const spy = stubApi({
      'GET /api/service-paths/admin/areas/kymenlaakso': ok(area),
      'POST /api/service-paths/admin/status': () => new Response(null, { status: 200 }),
    })
    renderRoutes('/admin/service-paths/kymenlaakso')
    fireEvent.click(await screen.findByText('Terveystalo'))
    const drawer = await screen.findByRole('dialog')
    expect(within(drawer).getByText('draft')).toBeInTheDocument()
    fireEvent.click(within(drawer).getByRole('button', { name: 'Publish, checked today' }))
    await waitFor(() => expect(spy.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(true))
    const [, init] = spy.mock.calls.find(([, i]) => i?.method === 'POST')!
    expect(JSON.parse(String(init!.body))).toEqual({ kind: 'point', id: 12, status: 'published', verify: true })
  })

  it('shows every stage in the steps tab, mapped or not, with the national limit', async () => {
    stubApi({ 'GET /api/service-paths/admin/areas/kymenlaakso': ok(area) })
    renderRoutes('/admin/service-paths/kymenlaakso')
    fireEvent.click(await screen.findByRole('tab', { name: 'Steps' }))
    const table = await screen.findByRole('table', { name: 'Steps by stage' })
    expect(within(table).getByText('not mapped')).toBeInTheDocument()
    expect(within(table).getByText('Call on Friday')).toBeInTheDocument()
    expect(within(table).getByText(/same weekday, office hours/)).toBeInTheDocument()
  })

  it('refuses a new finding without a source before calling the API', async () => {
    const spy = stubApi({ 'GET /api/service-paths/admin/areas/kymenlaakso': ok(area) })
    renderRoutes('/admin/service-paths/kymenlaakso')
    fireEvent.click(await screen.findByRole('tab', { name: 'Findings' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Add finding' }))
    const drawer = await screen.findByRole('dialog')
    fireEvent.click(within(drawer).getByRole('button', { name: 'Save' }))
    expect(await within(drawer).findByText('A finding needs a source.')).toBeInTheDocument()
    expect(spy.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false)
  })

  it('shows an error with retry when the area cannot load', async () => {
    stubApi({ 'GET /api/service-paths/admin/areas/kymenlaakso': () => Response.json({ code: 'internal', message: 'boom' }, { status: 500 }) })
    renderRoutes('/admin/service-paths/kymenlaakso')
    expect(await screen.findByText('Could not load the area')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})

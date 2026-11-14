import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router'
import { AdminArea } from '@/app/admin/AdminArea'
import { clearAdminSession, setAdminSession, useAdminApi } from '@/features/admin-auth'
import { renderWithProviders } from '@/test/render'

describe('AdminArea guard', () => {
  afterEach(() => {
    clearAdminSession()
    vi.unstubAllGlobals()
  })

  it('redirects to the sign-in page without a session, keeping the target as next', async () => {
    const fetchSpy = vi.fn(async (_input: RequestInfo | URL) => new Response('{}', { status: 500 }))
    vi.stubGlobal('fetch', fetchSpy)

    renderWithProviders(
      <Routes>
        <Route path="/admin/*" element={<AdminArea />} />
      </Routes>,
      { route: '/admin/content' },
    )

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
    // No admin data was requested without a session (only the public demo account).
    expect(fetchSpy.mock.calls.map(([url]) => new URL(String(url)).pathname).filter((p) => p !== '/api/admin/demo')).toEqual([])
  })

  it('tells a view-only user that changes are not saved', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })))
    setAdminSession({
      token: 'viewer-token',
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      user: { id: 2, email: 'demo@example.test', displayName: 'Demo viewer', role: 'viewer' },
    })

    renderWithProviders(
      <Routes>
        <Route path="/admin/*" element={<AdminArea />} />
      </Routes>,
      { route: '/admin' },
    )

    expect(await screen.findByText('View-only demo')).toBeInTheDocument()
  })

  it('tells a view-only user right away when a change was refused', async () => {
    const refusal = { code: 'permission_denied', message: 'This is a view-only demo account.', details: null }
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => (init?.method === 'POST' ? Response.json(refusal, { status: 403 }) : new Response('{}', { status: 500 }))))
    setAdminSession({
      token: 'viewer-token',
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      user: { id: 2, email: 'demo@example.test', displayName: 'Demo viewer', role: 'viewer' },
    })
    let client: ReturnType<typeof useAdminApi> | null = null
    function Grab() {
      client = useAdminApi()
      return null
    }
    renderWithProviders(
      <>
        <Grab />
        <Routes>
          <Route path="/admin/*" element={<AdminArea />} />
        </Routes>
      </>,
      { route: '/admin' },
    )
    expect(screen.queryByText('Not saved')).toBeNull()

    await expect(client!.content.adminPublish({})).rejects.toThrow()

    expect(await screen.findByText('Not saved')).toBeInTheDocument()
  })

  it('shows no view-only notice to editors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })))
    setAdminSession({
      token: 'editor-token',
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      user: { id: 1, email: 'admin@example.test', displayName: 'Admin', role: 'editor' },
    })

    renderWithProviders(
      <Routes>
        <Route path="/admin/*" element={<AdminArea />} />
      </Routes>,
      { route: '/admin' },
    )

    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.queryByText('View-only demo')).toBeNull()
  })
})

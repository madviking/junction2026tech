import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes, useLocation } from 'react-router'
import { adminApi } from '@/features/admin-auth/adminApi'
import { SignInPage } from '@/features/admin-auth/SignInPage'
import { clearAdminSession, getAdminSession, setAdminSession } from '@/features/admin-auth/session'
import { renderWithProviders } from '@/test/render'

const result = {
  token: 'test-token-123',
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  user: { id: 1, email: 'admin@example.test', displayName: 'Test Admin' },
}

function Where() {
  const location = useLocation()
  return <p>{`at ${location.pathname}`}</p>
}

function renderSignIn(route = '/admin/sign-in?next=%2Fadmin%2Fcontent') {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/sign-in" element={<SignInPage />} />
      <Route path="*" element={<Where />} />
    </Routes>,
    { route },
  )
}

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'admin@example.test' } })
  fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'not-a-real-password' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('admin sign-in', () => {
  afterEach(() => {
    clearAdminSession()
    vi.unstubAllGlobals()
  })

  it('stores the session and goes to the next page', async () => {
    const fetchSpy = vi.fn(async () => Response.json(result))
    vi.stubGlobal('fetch', fetchSpy)
    renderSignIn()

    fillAndSubmit()

    expect(await screen.findByText('at /admin/content')).toBeInTheDocument()
    expect(getAdminSession()?.token).toBe('test-token-123')
    // eslint-disable-next-line no-restricted-properties -- asserts the documented session storage
    expect(window.sessionStorage.getItem('silta.admin.session')).toContain('test-token-123')
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/api\/admin\/sign-in$/)
    expect(JSON.parse(String(init.body))).toEqual({ email: 'admin@example.test', password: 'not-a-real-password' })
  })

  it('shows an error on 401 and stores nothing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ code: 'unauthenticated', message: 'invalid credentials' }, { status: 401 })))
    renderSignIn()

    fillAndSubmit()

    expect(await screen.findByText('Wrong email or password.')).toBeInTheDocument()
    expect(getAdminSession()).toBeNull()
  })

  it('sends the bearer token and clears the session on any 401', async () => {
    setAdminSession(result)
    const fetchSpy = vi.fn(async () => Response.json({ code: 'unauthenticated', message: 'session expired' }, { status: 401 }))
    vi.stubGlobal('fetch', fetchSpy)

    await expect(adminApi.admin.me()).rejects.toThrow()

    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer test-token-123')
    await waitFor(() => expect(getAdminSession()).toBeNull())
    // eslint-disable-next-line no-restricted-properties -- asserts the documented session storage
    expect(window.sessionStorage.getItem('silta.admin.session')).toBeNull()
  })
})

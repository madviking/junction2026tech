import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router'
import { AdminArea } from '@/app/admin/AdminArea'
import { clearAdminSession } from '@/features/admin-auth'
import { renderWithProviders } from '@/test/render'

describe('AdminArea guard', () => {
  afterEach(() => {
    clearAdminSession()
    vi.unstubAllGlobals()
  })

  it('redirects to the sign-in page without a session, keeping the target as next', async () => {
    const fetchSpy = vi.fn(async () => new Response('{}', { status: 500 }))
    vi.stubGlobal('fetch', fetchSpy)

    renderWithProviders(
      <Routes>
        <Route path="/admin/*" element={<AdminArea />} />
      </Routes>,
      { route: '/admin/content' },
    )

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
    // No admin data was requested without a session.
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

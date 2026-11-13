import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HealthPage } from '@/features/health/HealthPage'
import type { HealthStatus } from '@/shared/api/types'
import { renderWithProviders } from '@/test/render'

const healthy: HealthStatus = {
  status: 'ok',
  environment: 'test',
  checks: [
    { name: 'postgres', state: 'ok', detail: null },
    { name: 'redis', state: 'ok', detail: null },
  ],
}

function stubFetch(response: Response) {
  vi.stubGlobal('fetch', vi.fn(async () => response))
}

describe('HealthPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lists each dependency from the API', async () => {
    stubFetch(Response.json(healthy))

    renderWithProviders(<HealthPage />)

    expect(await screen.findByText('postgres')).toBeInTheDocument()
    expect(screen.getByText('redis')).toBeInTheDocument()
  })

  it('shows a retryable error when the backend fails', async () => {
    stubFetch(new Response('down', { status: 502 }))

    renderWithProviders(<HealthPage />)

    expect(await screen.findByText('Backend unreachable')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})

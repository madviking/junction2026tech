import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { UiProvider, type TextDirection } from '@/shared/ui'

export interface RenderOptions {
  /** Initial router location (default `/`). */
  route?: string
  dir?: TextDirection
  lang?: string
}

/** Render with the same providers as the app, a memory router and a fresh, no-retry query client. */
export function renderWithProviders(ui: ReactElement, { route = '/', dir = 'ltr', lang = 'en' }: RenderOptions = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <UiProvider dir={dir} lang={lang} env="test">
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </QueryClientProvider>
    </UiProvider>,
  )
}

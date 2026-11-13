import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { theme } from '@/shared/ui/theme'

/** Render with the same providers as the app and a fresh, no-retry query client. */
export function renderWithProviders(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MantineProvider theme={theme}>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </MantineProvider>,
  )
}

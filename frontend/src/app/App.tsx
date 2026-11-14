import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'
import { AppRoutes } from '@/app/AppRoutes'
import { queryClient } from '@/shared/api/queryClient'
import { UiProvider } from '@/shared/ui'

// The language feature will own dir/lang; until then the app is English, LTR.
export function App() {
  return (
    <UiProvider dir="ltr" lang="en">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </UiProvider>
  )
}

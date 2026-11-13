import createClient from 'openapi-fetch'
import type { paths } from '@/shared/api/generated/openapi'

// Typed from the backend contract. Paths, params and bodies are checked at compile time.
// Same-origin: Vite proxies /api in development and nginx does in production.
// fetch is resolved per call so tests can stub the network boundary with vi.stubGlobal.
export const api = createClient<paths>({
  baseUrl: globalThis.location?.origin ?? '',
  fetch: (request) => globalThis.fetch(request),
})

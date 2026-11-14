import { queryClient } from '@/shared/api/queryClient'
import Client, { APIError } from '@/shared/api/client'
import { clearAdminSession, getAdminSession } from '@/features/admin-auth/session'

/** Base URL of the API, the same rule as `@/shared/api/api`. */
export const adminApiBase: string = import.meta.env.VITE_API_URL ?? globalThis.location?.origin ?? ''

/** Removes every cached admin query (query keys of admin features start with `admin-`). */
export function forgetAdminQueries() {
  queryClient.removeQueries({ predicate: (query) => String(query.queryKey[0]).startsWith('admin-') })
}

/**
 * The admin client: the generated client with `Authorization: Bearer <token>` from the
 * session on every call. Any 401 clears the session, which sends the admin back to the
 * sign-in page (`RequireAdminSession`). fetch is resolved per call so tests can stub it.
 */
export const adminApi = new Client(adminApiBase, {
  auth: () => {
    const session = getAdminSession()
    return session ? { authorization: `Bearer ${session.token}` } : undefined
  },
  fetcher: async (input, init) => {
    const response = await globalThis.fetch(input, init)
    if (response.status === 401) {
      clearAdminSession()
      forgetAdminQueries()
    }
    return response
  },
})

export type AdminApi = typeof adminApi

/** The authenticated client for admin features (one instance; the token is read per call). */
export function useAdminApi(): AdminApi {
  return adminApi
}

/** A short, readable message for an admin API error. */
export function adminErrorMessage(error: unknown): string {
  if (error instanceof APIError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

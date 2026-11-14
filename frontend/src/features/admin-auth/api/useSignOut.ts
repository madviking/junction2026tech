import { useMutation } from '@tanstack/react-query'
import { adminApi, forgetAdminQueries } from '@/features/admin-auth/adminApi'
import { clearAdminSession, getAdminSession } from '@/features/admin-auth/session'

/** Ends the server session, then forgets it locally (also when the server call fails). */
export function useSignOut() {
  return useMutation({
    mutationKey: ['admin-auth', 'sign-out'],
    mutationFn: async () => {
      const session = getAdminSession()
      if (session) await adminApi.admin.signOut({ authorization: `Bearer ${session.token}` })
    },
    onSettled: () => {
      clearAdminSession()
      forgetAdminQueries()
    },
  })
}

import { useMutation } from '@tanstack/react-query'
import { setAdminSession } from '@/features/admin-auth/session'
import { api } from '@/shared/api/api'

/** Signs in with email and password and stores the session. */
export function useSignIn() {
  return useMutation({
    mutationKey: ['admin-auth', 'sign-in'],
    mutationFn: (credentials: { email: string; password: string }) => api.admin.signIn(credentials),
    onSuccess: (result) => setAdminSession(result),
  })
}

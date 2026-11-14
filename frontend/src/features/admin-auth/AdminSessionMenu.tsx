import { useSignOut } from '@/features/admin-auth/api/useSignOut'
import { UserMenu } from '@/features/admin-auth/components/UserMenu'
import { useAdminSession } from '@/features/admin-auth/session'

/** The signed-in admin's name and a sign-out button, for the AdminShell header. */
export function AdminSessionMenu() {
  const session = useAdminSession()
  const signOut = useSignOut()
  if (!session) return null
  return (
    <UserMenu
      name={session.user.displayName}
      email={session.user.email}
      signingOut={signOut.isPending}
      onSignOut={() => signOut.mutate()}
    />
  )
}

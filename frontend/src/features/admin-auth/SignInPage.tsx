import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { adminErrorMessage } from '@/features/admin-auth/adminApi'
import { useSignIn } from '@/features/admin-auth/api/useSignIn'
import { safeAdminNext } from '@/features/admin-auth/safeAdminNext'
import { SignInForm } from '@/features/admin-auth/components/SignInForm'
import { useAdminSession } from '@/features/admin-auth/session'
import { APIError } from '@/shared/api/client'
import { Container, Section, Stack, SurfaceCard, Text } from '@/shared/ui'

function signInError(error: unknown): string | null {
  if (!error) return null
  if (error instanceof APIError && (error.status === 401 || error.status === 403)) return 'Wrong email or password.'
  return adminErrorMessage(error)
}

/** `/admin/sign-in`, outside the AdminShell. */
export function SignInPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const session = useAdminSession()
  const signIn = useSignIn()
  const next = safeAdminNext(params.get('next'))

  if (session && !signIn.isPending && !signIn.isSuccess) return <Navigate to={next} replace />

  return (
    <Container width="narrow">
      <Stack gap="lg">
        <Section level={1} eyebrow="Silta admin" title="Sign in" description="Content, audio and usage tools for the Silta team.">
          <SurfaceCard padding="lg">
            <SignInForm
              pending={signIn.isPending}
              error={signInError(signIn.error)}
              onSubmit={(credentials) => signIn.mutate(credentials, { onSuccess: () => navigate(next, { replace: true }) })}
            />
          </SurfaceCard>
        </Section>
        <Text variant="caption" tone="muted">
          Your session stays in this browser tab only and ends after 12 hours or when you sign out.
        </Text>
      </Stack>
    </Container>
  )
}

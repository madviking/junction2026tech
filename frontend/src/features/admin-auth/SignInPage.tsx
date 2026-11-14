import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { adminErrorMessage } from '@/features/admin-auth/adminApi'
import { useDemoAccount } from '@/features/admin-auth/api/useDemoAccount'
import { useSignIn } from '@/features/admin-auth/api/useSignIn'
import { DemoAccessCard } from '@/features/admin-auth/components/DemoAccessCard'
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
  const demo = useDemoAccount()
  const next = safeAdminNext(params.get('next'))
  const submit = (credentials: { email: string; password: string }) =>
    signIn.mutate(credentials, { onSuccess: () => navigate(next, { replace: true }) })

  if (session && !signIn.isPending && !signIn.isSuccess) return <Navigate to={next} replace />

  return (
    <Container width="narrow">
      <Stack gap="lg">
        <Section level={1} eyebrow="Silta admin" title="Sign in" description="Content, audio and usage tools for the Silta team.">
          <SurfaceCard padding="lg">
            <SignInForm
              pending={signIn.isPending}
              error={signInError(signIn.error)}
              onSubmit={submit}
            />
          </SurfaceCard>
        </Section>
        {demo.data && (
          <DemoAccessCard
            email={demo.data.email}
            password={demo.data.password}
            pending={signIn.isPending}
            onUse={() => submit({ email: demo.data.email, password: demo.data.password })}
          />
        )}
        <Text variant="caption" tone="muted">
          Your session stays in this browser tab only and ends after 12 hours or when you sign out.
        </Text>
      </Stack>
    </Container>
  )
}

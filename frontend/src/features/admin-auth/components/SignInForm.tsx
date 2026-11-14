import { useState, type FormEvent } from 'react'
import { ActionButton, Banner, PasswordField, Stack, TextField } from '@/shared/ui'

export interface SignInFormProps {
  onSubmit: (credentials: { email: string; password: string }) => void
  pending: boolean
  /** Error from the last attempt (wrong credentials, network). */
  error?: string | null
}

/** Email + password form. Presentational: the page owns the sign-in call. */
export function SignInForm({ onSubmit, pending, error }: SignInFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [missing, setMissing] = useState(false)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !password) {
      setMissing(true)
      return
    }
    setMissing(false)
    onSubmit({ email: email.trim(), password })
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Sign in">
      <Stack gap="md">
        {error && (
          <Banner tone="warning" title="Sign-in failed">
            {error}
          </Banner>
        )}
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="username"
          value={email}
          onChange={setEmail}
          required
          error={missing && !email.trim() ? 'Enter your email.' : undefined}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          required
          error={missing && !password ? 'Enter your password.' : undefined}
        />
        <ActionButton type="submit" loading={pending} fullWidth>
          Sign in
        </ActionButton>
      </Stack>
    </form>
  )
}

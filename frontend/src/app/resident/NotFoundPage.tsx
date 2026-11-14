import { ActionButton, EmptyState, PageShell } from '@/shared/ui'

export function NotFoundPage() {
  return (
    <PageShell title="Silta">
      <EmptyState
        title="Page not found"
        description="This address does not exist."
        action={<ActionButton href="/">Go to start</ActionButton>}
      />
    </PageShell>
  )
}

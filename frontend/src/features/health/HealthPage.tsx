import { useHealth } from '@/features/health/useHealth'
import { Divider, ErrorState, LoadingState, PageShell, Row, Section, Stack, StatusBadge, SurfaceCard, Text } from '@/shared/ui'

const STATE_TONE = { ok: 'success', degraded: 'warning', unavailable: 'danger' } as const

export function HealthPage() {
  const health = useHealth()

  return (
    <PageShell title="System">
      <SurfaceCard>
        <Section
          eyebrow="System"
          title="Service health"
          level={3}
          description="Backend and data services as seen by the API."
          aside={health.data && <StatusBadge tone={STATE_TONE[health.data.status]}>{health.data.status}</StatusBadge>}
        >
          {health.isPending && <LoadingState label="Loading health status" />}

          {health.isError && (
            <ErrorState
              title="Backend unreachable"
              message={`${health.error.message}. Is the backend running on port 8300?`}
              onRetry={() => health.refetch()}
              retrying={health.isRefetching}
            />
          )}

          {health.data && (
            <Stack gap="sm">
              {health.data.checks.map((check, index) => (
                <Stack key={check.name} gap="sm">
                  {index > 0 && <Divider />}
                  <Row justify="between">
                    <Text variant="label">{check.name}</Text>
                    <StatusBadge tone={STATE_TONE[check.state]}>{check.state}</StatusBadge>
                  </Row>
                </Stack>
              ))}
            </Stack>
          )}
        </Section>
      </SurfaceCard>
    </PageShell>
  )
}

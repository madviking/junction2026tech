import { Alert, Badge, Button, Card, Group, Loader, Stack, Table, Text, Title } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import { useHealth } from '@/features/health/useHealth'

const STATE_COLOR = { ok: 'teal', degraded: 'yellow', unavailable: 'red' } as const

export function HealthPage() {
  const health = useHealth()

  return (
    <Card withBorder radius="md" maw={640}>
      <Stack gap="md">
        <div>
          <Text size="xs" fw={700} tt="uppercase" c="dimmed">
            System
          </Text>
          <Group justify="space-between">
            <Title order={4}>Service health</Title>
            {health.data && (
              <Badge color={STATE_COLOR[health.data.status]}>{health.data.status}</Badge>
            )}
          </Group>
          <Text size="sm" c="dimmed">
            Backend and data services as seen by the API.
          </Text>
        </div>

        {health.isPending && <Loader size="sm" aria-label="Loading health status" />}

        {health.isError && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />} title="Backend unreachable">
            <Stack gap="xs" align="flex-start">
              <Text size="sm">{health.error.message}. Is the backend running on port 8300?</Text>
              <Button size="xs" variant="light" onClick={() => health.refetch()}>
                Retry
              </Button>
            </Stack>
          </Alert>
        )}

        {health.data && (
          <Table withTableBorder withRowBorders highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Dependency</Table.Th>
                <Table.Th>State</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {health.data.checks.map((check) => (
                <Table.Tr key={check.name}>
                  <Table.Td>{check.name}</Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={STATE_COLOR[check.state]}>
                      {check.state}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Card>
  )
}

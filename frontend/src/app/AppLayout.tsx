import { AppShell, Group, Title } from '@mantine/core'
import { Outlet } from 'react-router'

const HEADER = { height: 56 }

export function AppLayout() {
  return (
    <AppShell header={HEADER} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md">
          <Title order={3}>Junction 2026</Title>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}

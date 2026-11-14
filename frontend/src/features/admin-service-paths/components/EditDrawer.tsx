import type { ReactNode } from 'react'
import { StatusPill } from '@/features/admin-service-paths/components/StatusPill'
import type { FactStatus } from '@/features/admin-service-paths/types'
import { ActionButton, Banner, Row, Stack, Text } from '@/shared/ui'
import { SideDrawer } from '@/shared/ui/admin'

export interface StatusActions {
  status: FactStatus
  verifiedOn: string | null
  /** Publishes and stamps today's check date. */
  onPublish: () => void
  onSetStatus: (status: FactStatus) => void
  busy: boolean
}

export interface EditDrawerProps {
  opened: boolean
  title: string
  onClose: () => void
  onSave: () => void
  saving: boolean
  error: string | null
  /** Absent for a row that is not saved yet. */
  statusActions?: StatusActions
  children: ReactNode
}

/** Shared editor shell: fields, save, and the publish / dispute / stale actions. */
export function EditDrawer({ opened, title, onClose, onSave, saving, error, statusActions, children }: EditDrawerProps) {
  const s = statusActions
  return (
    <SideDrawer
      opened={opened}
      onClose={onClose}
      title={title}
      footer={
        <Row gap="sm" justify="between">
          <Row gap="sm">
            <ActionButton compact loading={saving} onPress={onSave}>
              Save
            </ActionButton>
            <ActionButton compact variant="secondary" onPress={onClose}>
              Close
            </ActionButton>
          </Row>
          {s && (
            <Row gap="sm">
              {s.status !== 'published' && (
                <ActionButton compact variant="secondary" loading={s.busy} onPress={s.onPublish}>
                  Publish, checked today
                </ActionButton>
              )}
              {s.status !== 'disputed' && (
                <ActionButton compact variant="subtle" disabled={s.busy} onPress={() => s.onSetStatus('disputed')}>
                  Mark disputed
                </ActionButton>
              )}
              {s.status === 'published' && (
                <ActionButton compact variant="subtle" disabled={s.busy} onPress={() => s.onSetStatus('stale')}>
                  Mark stale
                </ActionButton>
              )}
              {s.status !== 'draft' && (
                <ActionButton compact variant="subtle" disabled={s.busy} onPress={() => s.onSetStatus('draft')}>
                  Back to draft
                </ActionButton>
              )}
            </Row>
          )}
        </Row>
      }
    >
      <Stack gap="md">
        {s && (
          <Row gap="sm">
            <StatusPill status={s.status} verifiedOn={s.verifiedOn} />
            <Text variant="caption" tone="muted" as="span">
              Only published rows reach residents and the comparison. Publishing needs a source.
            </Text>
          </Row>
        )}
        {error && (
          <Banner tone="warning" title="Not saved">
            {error}
          </Banner>
        )}
        {children}
      </Stack>
    </SideDrawer>
  )
}

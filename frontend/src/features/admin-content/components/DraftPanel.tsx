import { useState } from 'react'
import { ActionButton, Banner, Row, Stack, StatusBadge, Text, TextField } from '@/shared/ui'
import { IssuesList } from '@/features/admin-content/components/IssuesList'
import type { DraftDetail, ValidationIssue } from '@/features/admin-content/types'

export interface DraftPanelProps {
  draft: DraftDetail
  onPublish: (note: string) => void
  publishing: boolean
  /** Message and issues of a refused or failed publish. */
  publishError?: { message: string; issues: ValidationIssue[] } | null
  /** Set after a successful publish. */
  publishedVersion?: number | null
  onDiscard: () => void
  discarding: boolean
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

/** Draft state on top of the content page: what publishing would change, its issues, publish and discard. */
export function DraftPanel({ draft, onPublish, publishing, publishError, publishedVersion, onDiscard, discarding }: DraftPanelProps) {
  const [note, setNote] = useState('')
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const { summary, issues } = draft

  if (!summary.exists) {
    return (
      <Stack gap="sm">
        {publishedVersion ? (
          <Banner tone="success" title={`Published version ${publishedVersion}`}>
            Residents now see the new texts.
          </Banner>
        ) : null}
        <Row gap="sm">
          <StatusBadge tone="neutral">No draft</StatusBadge>
          <Text tone="muted" as="span">
            {`Live version ${summary.basedOnVersion}. Editing a text starts a draft; residents see nothing until you publish.`}
          </Text>
        </Row>
      </Stack>
    )
  }

  const hasErrors = summary.errors > 0
  return (
    <Stack gap="md">
      <Row gap="sm">
        <StatusBadge tone="info">Draft</StatusBadge>
        <Text as="span">
          {`Based on version ${summary.basedOnVersion} · ${plural(summary.changedKeys.length, 'changed text', 'changed texts')}`}
        </Text>
        <StatusBadge tone={hasErrors ? 'danger' : 'success'}>{plural(summary.errors, 'error', 'errors')}</StatusBadge>
        <StatusBadge tone={summary.warnings > 0 ? 'warning' : 'neutral'}>{plural(summary.warnings, 'warning', 'warnings')}</StatusBadge>
      </Row>
      {summary.changedKeys.length > 0 && (
        <Text variant="caption" tone="muted">
          {`Changed: ${summary.changedKeys.join(', ')}`}
        </Text>
      )}
      <IssuesList issues={issues} />
      {publishError && (
        <Banner tone="warning" title="Nothing was published">
          <Stack gap="xs">
            <Text as="span">{publishError.message}</Text>
            <IssuesList issues={publishError.issues} />
          </Stack>
        </Banner>
      )}
      <Row gap="sm" align="end">
        <TextField label="Publish note (optional)" value={note} onChange={setNote} placeholder="What changed and why" />
        <ActionButton compact loading={publishing} onPress={() => onPublish(note)}>
          Publish
        </ActionButton>
        {confirmDiscard ? (
          <>
            <ActionButton variant="danger" compact loading={discarding} onPress={onDiscard}>
              Discard all draft changes
            </ActionButton>
            <ActionButton variant="subtle" compact onPress={() => setConfirmDiscard(false)}>
              Keep draft
            </ActionButton>
          </>
        ) : (
          <ActionButton variant="secondary" compact onPress={() => setConfirmDiscard(true)}>
            Discard draft
          </ActionButton>
        )}
      </Row>
    </Stack>
  )
}

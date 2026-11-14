import { useMemo, type ReactNode } from 'react'
import { EmptyState, Row, Stack, StatusBadge, Text } from '@/shared/ui'
import { DataTable, type DataTableColumn } from '@/shared/ui/admin'
import { ReviewBadge } from '@/features/admin-content/components/ReviewBadge'
import type { ContentLanguage, TextRow } from '@/features/admin-content/types'

export interface TextsTableProps {
  rows: TextRow[]
  languages: ContentLanguage[]
  onOpen: (row: TextRow) => void
  toolbar?: ReactNode
}

function preview(text: string | null | undefined) {
  if (!text) return '—'
  return text.length > 90 ? `${text.slice(0, 87)}…` : text
}

/** Text rows with per-language review status; a row opens the editor. */
export function TextsTable({ rows, languages, onOpen, toolbar }: TextsTableProps) {
  const columns = useMemo<DataTableColumn<TextRow>[]>(
    () => [
      {
        key: 'text',
        header: 'Text',
        render: (row) => (
          <Stack gap="xs">
            <Text variant="label" as="span">
              {row.label}
            </Text>
            <Text variant="caption" tone="muted" as="span">
              {row.key}
            </Text>
          </Stack>
        ),
      },
      { key: 'english', header: 'English', render: (row) => preview(row.entries.find((e) => e.lang === 'en')?.text) },
      { key: 'group', header: 'Group', render: (row) => row.group },
      {
        key: 'status',
        header: 'Status per language',
        render: (row) => (
          <Row gap="xs">
            {languages.map((language) => {
              const entry = row.entries.find((e) => e.lang === language.code)
              return <ReviewBadge key={language.code} lang={language.code} review={entry?.review ?? 'missing'} />
            })}
            {row.changedInDraft && <StatusBadge tone="info">Changed in draft</StatusBadge>}
          </Row>
        ),
      },
    ],
    [languages],
  )

  return (
    <DataTable
      label="Content texts"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.key}
      onRowClick={onOpen}
      toolbar={toolbar}
      minWidth={900}
      emptyState={<EmptyState title="No texts match" description="Change the filters or clear the search." />}
    />
  )
}

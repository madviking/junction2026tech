import { useMemo, type ReactNode } from 'react'
import { AudioPlayButton, EmptyState, Stack, Text, type AudioPlayState } from '@/shared/ui'
import { DataTable, type DataTableColumn } from '@/shared/ui/admin'
import { AssetBadge, ServedBadge } from '@/features/admin-audio/components/AudioBadges'
import { servedAsset } from '@/features/admin-audio/lib/served'
import type { AudioAssetRow } from '@/features/admin-audio/types'

export interface AssetsTableProps {
  rows: AudioAssetRow[]
  onOpen: (row: AudioAssetRow) => void
  /** Plays the URL of what residents hear for a row. */
  onListen: (url: string) => void
  listenState: (url: string) => AudioPlayState
  toolbar?: ReactNode
}

/** One row per text key: text, what is served, human and generated status, stale count, listen. */
export function AssetsTable({ rows, onOpen, onListen, listenState, toolbar }: AssetsTableProps) {
  const columns = useMemo<DataTableColumn<AudioAssetRow>[]>(
    () => [
      {
        key: 'text',
        header: 'Text',
        render: (row) => (
          <Stack gap="xs">
            <Text variant="label" as="span">
              {row.text}
            </Text>
            <Text variant="caption" tone="muted" as="span">
              {row.key}
            </Text>
          </Stack>
        ),
      },
      { key: 'served', header: 'Served', render: (row) => <ServedBadge served={row.served} /> },
      { key: 'human', header: 'Human recording', render: (row) => <AssetBadge asset={row.human} /> },
      { key: 'generated', header: 'Generated', render: (row) => <AssetBadge asset={row.generated} /> },
      { key: 'stale', header: 'Stale', render: (row) => row.staleAssets, numeric: true },
      {
        key: 'listen',
        header: 'Listen',
        render: (row) => {
          const asset = servedAsset(row)
          if (!asset) return null
          return (
            <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} role="presentation">
              <AudioPlayButton state={listenState(asset.url)} label={`Listen: ${row.key}`} onPress={() => onListen(asset.url)} />
            </span>
          )
        },
      },
    ],
    [listenState, onListen],
  )
  return (
    <DataTable
      label="Audio per text"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.key}
      onRowClick={onOpen}
      toolbar={toolbar}
      minWidth={900}
      emptyState={<EmptyState title="No texts match" description="Change the filter or clear the search." />}
    />
  )
}

import { StatusBadge } from '@/shared/ui'
import type { AudioAsset, AudioAssetRow } from '@/features/admin-audio/types'

/** What residents hear now: human, generated or nothing yet. */
export function ServedBadge({ served }: { served: AudioAssetRow['served'] }) {
  if (served === 'human') return <StatusBadge tone="success">Human recording</StatusBadge>
  if (served === 'generated') return <StatusBadge tone="info">Generated</StatusBadge>
  return <StatusBadge tone="neutral">None yet</StatusBadge>
}

/** Review state of one asset, or "none". */
export function AssetBadge({ asset }: { asset: AudioAsset | null }) {
  if (!asset) return <StatusBadge tone="neutral">none</StatusBadge>
  return asset.review === 'approved' ? <StatusBadge tone="success">approved</StatusBadge> : <StatusBadge tone="warning">unchecked</StatusBadge>
}

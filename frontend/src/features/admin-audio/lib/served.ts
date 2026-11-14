import type { AudioAsset, AudioAssetRow } from '@/features/admin-audio/types'

/** The asset residents hear for a row: approved human recording first, else generated audio. */
export function servedAsset(row: AudioAssetRow): AudioAsset | null {
  if (row.served === 'human') return row.human
  if (row.served === 'generated') return row.generated
  return null
}

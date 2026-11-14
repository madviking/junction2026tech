import type { voice } from '@/shared/api/client'

// Short names for the generated voice admin types used by this feature.
export type AudioAssetRow = voice.AdminAssetRow
export type AudioAsset = voice.AssetView
export type VoiceLanguage = voice.LanguageCapability

/** Which rows the table shows. */
export type ServedFilter = 'all' | 'human' | 'generated' | 'none' | 'unapproved' | 'stale'

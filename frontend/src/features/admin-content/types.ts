import type { content, domain } from '@/shared/api/client'

// Short names for the generated content admin types used by this feature.
export type TextRow = content.TextRow
export type TextEntryView = content.TextEntryView
export type TextFilter = content.TextFilter
export type TextGroup = content.TextGroup
export type TextsResponse = content.TextsResponse
export type ContentLanguage = content.LanguageView
export type DraftSummary = content.DraftSummary
export type DraftDetail = content.DraftDetail
export type ReleaseInfo = content.ReleaseInfo
export type ReviewFlag = content.ReviewFlag
export type ValidationIssue = domain.ValidationIssue

/** The filters of the content list (all optional; empty string = no filter). */
export interface TextFilters {
  lang: string
  filter: TextFilter
  group: string
  search: string
}

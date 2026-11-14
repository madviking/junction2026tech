import type { TextFilters } from '@/features/admin-content/types'

/** Query keys of this feature; all start with the feature name. */
export const contentAdminKeys = {
  all: ['admin-content'] as const,
  texts: (filters: TextFilters) => ['admin-content', 'texts', filters] as const,
  draft: ['admin-content', 'draft'] as const,
  flags: ['admin-content', 'review-flags'] as const,
  versions: ['admin-content', 'versions'] as const,
}

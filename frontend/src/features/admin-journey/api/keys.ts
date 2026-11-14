/** Query keys of this feature; all start with the feature name. */
export const journeyKeys = {
  all: ['admin-journey'] as const,
  graph: ['admin-journey', 'graph'] as const,
}

/** The content admin feature's queries (draft panel, texts) share the draft; refreshed by key prefix only. */
export const CONTENT_ADMIN_PREFIX = ['admin-content'] as const

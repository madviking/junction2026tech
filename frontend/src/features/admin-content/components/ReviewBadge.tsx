import { StatusBadge } from '@/shared/ui'
import type { TextEntryView } from '@/features/admin-content/types'

const TONE = { checked: 'success', unchecked: 'warning', missing: 'danger' } as const

/** checked / unchecked / missing, optionally prefixed with the language code. */
export function ReviewBadge({ review, lang }: { review: TextEntryView['review']; lang?: string }) {
  return <StatusBadge tone={TONE[review]}>{lang ? `${lang.toUpperCase()} ${review}` : review}</StatusBadge>
}

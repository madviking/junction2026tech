import { createContext, useContext } from 'react'
import type { LiveBundle, ResolvedText } from '@/shared/api/types'
import type { Vars } from '@/shared/i18n/translate'

export interface ContentValue {
  lang: string
  dir: 'ltr' | 'rtl'
  /** True for languages whose texts are unchecked placeholders (show the marker). */
  placeholder: boolean
  bundle: LiveBundle
  t: (key: string, vars?: Vars) => string
  has: (key: string) => boolean
  meta: (key: string) => ResolvedText | undefined
}

export const ContentContext = createContext<ContentValue | null>(null)

export function useContent(): ContentValue {
  const value = useContext(ContentContext)
  if (!value) throw new Error('useContent must be used inside <ContentProvider>')
  return value
}

/** Shorthand: const t = useT(); t('ui.journey.next') */
export function useT(): ContentValue['t'] {
  return useContent().t
}

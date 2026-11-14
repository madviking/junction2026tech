import { useMemo, type ReactNode } from 'react'
import { ContentContext, type ContentValue } from '@/shared/i18n/context'
import { hasText, translate } from '@/shared/i18n/translate'
import { useLiveContent } from '@/shared/i18n/useLiveContent'
import { DocumentLanguage, ErrorState, LoadingState } from '@/shared/ui'


/**
 * The one i18n layer: every resident text comes from the published content through
 * this provider. It also sets the page direction (Arabic is right-to-left).
 */
export function ContentProvider({ lang, children }: { lang: string; children: ReactNode }) {
  const query = useLiveContent(lang)
  const value = useMemo<ContentValue | null>(() => {
    const bundle = query.data
    if (!bundle) return null
    return {
      lang: bundle.lang,
      dir: bundle.dir,
      placeholder: bundle.placeholder,
      bundle,
      t: (key, vars) => translate(bundle, key, vars),
      has: (key) => hasText(bundle, key),
      meta: (key) => bundle.texts[key],
    }
  }, [query.data])

  if (query.isError) {
    return <ErrorState title="Content could not be loaded" message={query.error.message} onRetry={() => query.refetch()} />
  }
  if (!value) return <LoadingState label="Loading" />
  return (
    <ContentContext.Provider value={value}>
      <DocumentLanguage dir={value.dir} lang={value.lang} />
      {children}
    </ContentContext.Provider>
  )
}

import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { ContentProvider } from '@/shared/i18n'

/** Wraps a resident page in the published content of the `:lang` route parameter. */
export function WithLanguage({ children, lang }: { children: ReactNode; lang?: string }) {
  const params = useParams()
  return <ContentProvider lang={lang ?? params.lang ?? 'en'}>{children}</ContentProvider>
}

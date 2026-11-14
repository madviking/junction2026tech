import '@mantine/core/styles.layer.css'
import '@/shared/ui/global.css'
import { DirectionProvider, MantineProvider, useDirection } from '@mantine/core'
import { useEffect, type ReactNode } from 'react'
import { cssVariablesResolver, theme } from '@/shared/ui/theme'

export type TextDirection = 'ltr' | 'rtl'

export interface UiProviderProps {
  /** Writing direction of the current language. */
  dir: TextDirection
  /** BCP 47 language tag of the current language, for example `en`, `ar`, `so`. */
  lang: string
  /** `test` disables transitions and portals (used by the test render helper). */
  env?: 'default' | 'test'
  children: ReactNode
}

/** The only place Mantine is configured. Keeps `<html dir lang>` in sync with the props. */
export function UiProvider({ dir, lang, env = 'default', children }: UiProviderProps) {
  return (
    <DirectionProvider initialDirection={dir} detectDirection={false}>
      <DocumentLanguage dir={dir} lang={lang} />
      <MantineProvider
        theme={theme}
        cssVariablesResolver={cssVariablesResolver}
        forceColorScheme="light"
        env={env}
      >
        {children}
      </MantineProvider>
    </DirectionProvider>
  )
}

/** Sets the writing direction and `<html dir lang>` for the current language (used by the i18n layer). */
export function DocumentLanguage({ dir, lang }: { dir: TextDirection; lang: string }) {
  const { setDirection } = useDirection()
  useEffect(() => {
    setDirection(dir)
    document.documentElement.dir = dir
    document.documentElement.lang = lang
  }, [dir, lang, setDirection])
  return null
}

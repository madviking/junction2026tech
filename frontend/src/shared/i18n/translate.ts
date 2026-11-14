import type { LiveBundle } from '@/shared/api/types'

export type Vars = Record<string, string | number>

/**
 * Text for a key in the bundle's language (the backend already fell back to English).
 * Missing keys render as the key itself so a gap is visible, never blank.
 * `{name}` placeholders are filled from vars.
 */
export function translate(bundle: LiveBundle, key: string, vars?: Vars): string {
  const text = bundle.texts[key]?.text ?? key
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match))
}

export function hasText(bundle: LiveBundle, key: string): boolean {
  return Boolean(bundle.texts[key]?.text)
}

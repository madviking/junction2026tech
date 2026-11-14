import { useMemo } from 'react'
import { SelectField, TextField, type SelectOption } from '@/shared/ui'
import { Toolbar } from '@/shared/ui/admin'
import type { ServedFilter, VoiceLanguage } from '@/features/admin-audio/types'

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  fi: 'Suomi',
  sv: 'Svenska',
  ru: 'Русский',
  et: 'Eesti',
  uk: 'Українська',
  ar: 'العربية',
  so: 'Soomaali',
  fa: 'فارسی',
  zh: '中文（普通话）',
  yue: '廣東話',
  vi: 'Tiếng Việt',
  th: 'ไทย',
  bg: 'Български',
}

const SHOW_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All texts' },
  { value: 'human', label: 'Serving a human recording' },
  { value: 'generated', label: 'Serving generated audio' },
  { value: 'none', label: 'No audio yet' },
  { value: 'unapproved', label: 'Recording waiting for approval' },
  { value: 'stale', label: 'Has stale audio' },
]

export interface AudioFiltersProps {
  languages: VoiceLanguage[]
  lang: string
  onLangChange: (lang: string) => void
  show: ServedFilter
  onShowChange: (show: ServedFilter) => void
  search: string
  onSearchChange: (search: string) => void
}

/** Language, what to show, and a key/text search. */
export function AudioFilters({ languages, lang, onLangChange, show, onShowChange, search, onSearchChange }: AudioFiltersProps) {
  const languageOptions = useMemo<SelectOption[]>(
    () =>
      languages
        .filter((l) => l.audioOutput)
        .map((l) => ({ value: l.lang, label: `${LANGUAGE_NAMES[l.lang] ?? l.lang} (${l.lang})` })),
    [languages],
  )
  return (
    <Toolbar>
      <SelectField label="Language" options={languageOptions} value={lang} onChange={(value) => value && onLangChange(value)} />
      <SelectField label="Show" options={SHOW_OPTIONS} value={show} onChange={(value) => onShowChange((value ?? 'all') as ServedFilter)} />
      <TextField label="Search" type="search" placeholder="Key or text" value={search} onChange={onSearchChange} />
    </Toolbar>
  )
}

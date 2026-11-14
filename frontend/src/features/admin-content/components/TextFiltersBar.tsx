import { useMemo } from 'react'
import { SelectField, TextField, type SelectOption } from '@/shared/ui'
import { Toolbar } from '@/shared/ui/admin'
import type { ContentLanguage, TextFilter, TextFilters } from '@/features/admin-content/types'

const SHOW_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All texts' },
  { value: 'needs_review', label: 'Needs review' },
  { value: 'missing', label: 'Missing translation' },
]

/** Groups of text keys (the key prefix). Journey groups hold stage questions, outcome cards and their then-texts. */
const GROUP_OPTIONS: SelectOption[] = [
  { value: '', label: 'All groups' },
  { value: 'journey.stage', label: 'Journey: stage questions' },
  { value: 'journey.outcome', label: 'Journey: outcome cards and then-texts' },
  { value: 'journey.interrupt', label: 'Journey: interrupts' },
  { value: 'journey.fact', label: 'Journey: facts' },
  { value: 'card.symptom', label: 'Cards: symptoms' },
  { value: 'card.emergency', label: 'Cards: emergency signs' },
  { value: 'card.clinician', label: 'Cards: clinician' },
  { value: 'lane', label: 'Lanes' },
  { value: 'route', label: 'Routes' },
  { value: 'profile', label: 'Profiles' },
  { value: 'barrier', label: 'Barriers' },
  { value: 'rule', label: 'Rules' },
  { value: 'ui', label: 'Interface texts (ui)' },
  { value: 'step', label: 'Steps' },
]

export interface TextFiltersBarProps {
  filters: TextFilters
  languages: ContentLanguage[]
  onChange: (next: TextFilters) => void
}

/** Language, show (all / needs review / missing), group and search. */
export function TextFiltersBar({ filters, languages, onChange }: TextFiltersBarProps) {
  const languageOptions = useMemo<SelectOption[]>(
    () => [{ value: '', label: 'All languages' }, ...languages.map((l) => ({ value: l.code, label: `${l.name} (${l.code})` }))],
    [languages],
  )
  return (
    <Toolbar>
      <SelectField
        label="Language"
        options={languageOptions}
        value={filters.lang}
        onChange={(value) => onChange({ ...filters, lang: value ?? '' })}
      />
      <SelectField
        label="Show"
        options={SHOW_OPTIONS}
        value={filters.filter}
        onChange={(value) => onChange({ ...filters, filter: (value ?? 'all') as TextFilter })}
      />
      <SelectField
        label="Group"
        options={GROUP_OPTIONS}
        value={filters.group}
        onChange={(value) => onChange({ ...filters, group: value ?? '' })}
      />
      <TextField
        label="Search"
        type="search"
        placeholder="Key, label or text"
        value={filters.search}
        onChange={(search) => onChange({ ...filters, search })}
      />
    </Toolbar>
  )
}

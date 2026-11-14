import { ActionButton, Divider, Stack, StatusBadge, Text } from '@/shared/ui'
import { SideDrawer } from '@/shared/ui/admin'
import { LanguageEditor } from '@/features/admin-content/components/LanguageEditor'
import type { ContentLanguage, TextRow } from '@/features/admin-content/types'

const RTL_LANGS = new Set(['ar', 'fa'])

export interface TextDrawerProps {
  row: TextRow | null
  languages: ContentLanguage[]
  onClose: () => void
  onSave: (lang: string, text: string) => void
  /** Language whose save is running, if any. */
  savingLang?: string | null
  saveError?: { lang: string; message: string } | null
  onReview: (lang: string, status: 'checked' | 'unchecked') => void
  reviewingLang?: string | null
}

/** Edits one text in every language; saving goes into the draft and resets that language's review. */
export function TextDrawer({ row, languages, onClose, onSave, savingLang, saveError, onReview, reviewingLang }: TextDrawerProps) {
  return (
    <SideDrawer
      opened={row !== null}
      onClose={onClose}
      title={row ? row.label : 'Text'}
      footer={
        <ActionButton variant="secondary" compact onPress={onClose}>
          Close
        </ActionButton>
      }
    >
      {row && (
        <Stack gap="md">
          <Stack gap="xs">
            <Text variant="caption" tone="muted">
              {row.key}
            </Text>
            <Text variant="caption" tone="muted">
              {`Group ${row.group} · ${row.required ? 'required' : 'optional'}`}
            </Text>
            {row.changedInDraft && <StatusBadge tone="info">Changed in draft</StatusBadge>}
            <Text variant="caption" tone="muted">
              Saving a language puts the change in the draft and marks that language unchecked. Its audio becomes stale and is
              regenerated from the new text after publishing.
            </Text>
          </Stack>
          {languages.map((language, index) => {
            const entry = row.entries.find((e) => e.lang === language.code) ?? {
              lang: language.code,
              text: null,
              review: 'missing' as const,
              reviewer: null,
              reviewedAt: null,
            }
            return (
              <Stack key={language.code} gap="md">
                {index > 0 && <Divider />}
                <LanguageEditor
                  key={`${row.key}:${language.code}:${entry.text ?? ''}`}
                  entry={entry}
                  languageName={language.name}
                  dir={RTL_LANGS.has(language.code) ? 'rtl' : 'ltr'}
                  placeholder={language.placeholder}
                  onSave={(text) => onSave(language.code, text)}
                  saving={savingLang === language.code}
                  error={saveError?.lang === language.code ? saveError.message : null}
                  onReview={(status) => onReview(language.code, status)}
                  reviewing={reviewingLang === language.code}
                />
              </Stack>
            )
          })}
        </Stack>
      )}
    </SideDrawer>
  )
}

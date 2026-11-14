import { useState } from 'react'
import { ActionButton, DirectionScope, Row, Stack, Text, TextAreaField } from '@/shared/ui'
import { ReviewBadge } from '@/features/admin-content/components/ReviewBadge'
import { formatDateTime } from '@/features/admin-content/lib/format'
import type { TextEntryView } from '@/features/admin-content/types'

export interface LanguageEditorProps {
  entry: TextEntryView
  languageName: string
  dir: 'ltr' | 'rtl'
  placeholder: boolean
  onSave: (text: string) => void
  saving: boolean
  onReview: (status: 'checked' | 'unchecked') => void
  reviewing: boolean
  error?: string | null
}

/** One language of one text: edit and save, and its review status. Reset by keying on the saved text. */
export function LanguageEditor({ entry, languageName, dir, placeholder, onSave, saving, onReview, reviewing, error }: LanguageEditorProps) {
  const [text, setText] = useState(entry.text ?? '')
  const changed = text !== (entry.text ?? '')
  const label = `${languageName} (${entry.lang})${placeholder ? ' · placeholder language' : ''}`

  return (
    <Stack gap="sm">
      <DirectionScope dir={dir} lang={entry.lang}>
        <TextAreaField label={label} value={text} onChange={setText} rows={3} error={error ?? undefined} />
      </DirectionScope>
      <Row justify="between" gap="sm">
        <Row gap="xs">
          <ReviewBadge review={entry.review} />
          <Text variant="caption" tone="muted" as="span">
            {entry.reviewer ? `Checked by ${entry.reviewer}, ${formatDateTime(entry.reviewedAt)}` : entry.review === 'missing' ? 'No text yet' : 'Not reviewed'}
          </Text>
        </Row>
        <Row gap="xs">
          {entry.review === 'unchecked' && (
            <ActionButton variant="subtle" compact loading={reviewing} disabled={changed} onPress={() => onReview('checked')}>
              {`Mark ${entry.lang.toUpperCase()} checked`}
            </ActionButton>
          )}
          {entry.review === 'checked' && (
            <ActionButton variant="subtle" compact loading={reviewing} disabled={changed} onPress={() => onReview('unchecked')}>
              {`Mark ${entry.lang.toUpperCase()} unchecked`}
            </ActionButton>
          )}
          <ActionButton compact loading={saving} disabled={!changed} onPress={() => onSave(text)}>
            {`Save ${entry.lang.toUpperCase()}`}
          </ActionButton>
        </Row>
      </Row>
    </Stack>
  )
}

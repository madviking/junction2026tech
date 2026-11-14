import { Fragment } from 'react'
import { CardAudioButton } from '@/features/voice'
import type { ScriptLine, ScriptPart } from '@/features/journey/types'
import { useContent } from '@/shared/i18n'
import { DirectionScope, Divider, FaqItem, Row, Stack, SurfaceCard, Text, type TextProps } from '@/shared/ui'

export interface CallScriptProps {
  parts: ScriptPart[]
}

/**
 * The whole phone call in Finnish, line by line, each with its meaning in the person's
 * language: greeting, interpreter, the checked symptoms, the request, what they may ask,
 * closing. Lines with a text key play in Finnish and in the person's language.
 */
export function CallScript({ parts }: CallScriptProps) {
  const { t } = useContent()

  return (
    <SurfaceCard>
      <Stack gap="md">
        <Text variant="caption" eyebrow>
          {t('ui.journey.contact.script_title')}
        </Text>
        {parts.map((part, i) => {
          const lines = (
            <Stack gap="md">
              {part.lines.map((line, j) => (
                <ScriptLineRow key={`${line.key ?? 'composed'}-${j}`} line={line} variant={part.id === 'request' ? 'title' : line.item ? 'label' : 'heading'} />
              ))}
            </Stack>
          )
          return (
            <Fragment key={part.id}>
              {i > 0 && <Divider />}
              {/* Only needed if the nurse asks: closed until the person opens it. */}
              {part.id === 'they_ask' ? <FaqItem question={t('ui.journey.contact.they_ask')}>{lines}</FaqItem> : lines}
            </Fragment>
          )
        })}
      </Stack>
    </SurfaceCard>
  )
}

function ScriptLineRow({ line, variant }: { line: ScriptLine; variant: TextProps['variant'] }) {
  const { lang, t } = useContent()
  const showMeaning = lang !== 'fi' && line.local !== line.fi
  const bullet = line.item ? '• ' : ''

  return (
    <Stack gap="xs">
      <Row gap="sm" align="center" justify="between" wrap={false}>
        <DirectionScope dir="ltr" lang="fi">
          <Text variant={variant} as="p">
            {bullet}
            {line.fi}
          </Text>
        </DirectionScope>
        {line.key && <CardAudioButton textKey={line.key} lang="fi" label={t('ui.journey.contact.play_fi')} />}
      </Row>
      {showMeaning && (
        <Row gap="sm" align="center" justify="between" wrap={false}>
          <Text tone="muted">
            {bullet}
            {line.local}
          </Text>
          {line.key && <CardAudioButton textKey={line.key} />}
        </Row>
      )}
    </Stack>
  )
}

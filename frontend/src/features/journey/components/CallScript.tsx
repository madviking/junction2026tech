import { IconFileDownload } from '@tabler/icons-react'
import { Fragment } from 'react'
import { CardAudioButton } from '@/features/voice'
import type { ScriptLine, ScriptPart } from '@/features/journey/types'
import { useContent } from '@/shared/i18n'
import { ActionButton, DirectionScope, Divider, FaqItem, PrintHidden, PrintOnly, Row, Stack, SurfaceCard, Text, type TextProps } from '@/shared/ui'

export interface CallScriptProps {
  parts: ScriptPart[]
  /** The visit code, so the person (and the PDF) knows how to come back to this card. */
  code: string
}

/**
 * Saves the card as a PDF through the browser's own print dialog ("Save as PDF" on phones
 * and desktops), which renders every script and direction correctly. The page title
 * becomes the file name for the duration of the dialog.
 */
function saveAsPdf(code: string) {
  const title = document.title
  document.title = `Silta ${code}`
  window.addEventListener('afterprint', () => (document.title = title), { once: true })
  window.print()
}

/**
 * The whole phone call in Finnish, line by line, each with its meaning in the person's
 * language: greeting, interpreter, the checked symptoms, the request, what they may ask,
 * closing. Lines with a text key play in Finnish and in the person's language. The header
 * says what the card is, gives the code to come back with, and saves the card as a PDF.
 */
export function CallScript({ parts, code }: CallScriptProps) {
  const { t } = useContent()

  return (
    <SurfaceCard>
      <Stack gap="md">
        <Stack gap="sm">
          {/* Every text here has its own listen button, like the script lines below. */}
          <Row gap="sm" align="center" justify="between" wrap={false}>
            <Text variant="title" as="h2">
              {t('ui.journey.contact.card_title')}
            </Text>
            <CardAudioButton textKey="ui.journey.contact.card_title" />
          </Row>
          <Row gap="sm" align="center" justify="between" wrap={false}>
            {/* Same message, worded for the screen and for paper (PDF). */}
            <div>
              <PrintHidden>
                <Text>{t('ui.journey.contact.card_intro')}</Text>
              </PrintHidden>
              <PrintOnly>
                <Text>{t('ui.journey.contact.card_intro_print')}</Text>
              </PrintOnly>
            </div>
            <CardAudioButton textKey="ui.journey.contact.card_intro" />
          </Row>
          {/* The code stands alone (read letter by letter by screen readers), so the help text has
              no placeholder and can have audio. */}
          <DirectionScope dir="ltr" lang="zxx">
            <Text variant="heading" as="p">
              {code}
            </Text>
          </DirectionScope>
          <Row gap="sm" align="center" justify="between" wrap={false}>
            <Text tone="muted">{t('ui.journey.contact.card_code')}</Text>
            <CardAudioButton textKey="ui.journey.contact.card_code" />
          </Row>
          <PrintHidden>
            <ActionButton variant="secondary" icon={<IconFileDownload size={20} aria-hidden="true" />} onPress={() => saveAsPdf(code)}>
              {t('ui.journey.contact.save_pdf')}
            </ActionButton>
          </PrintHidden>
        </Stack>
        <Divider />
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
    <Row gap="sm" align="center" justify="between" wrap={false}>
      <Stack gap="xs">
        <DirectionScope dir="ltr" lang="fi">
          <Text variant={variant} as="p">
            {bullet}
            {line.fi}
          </Text>
        </DirectionScope>
        {showMeaning && (
          <Text tone="muted">
            {bullet}
            {line.local}
          </Text>
        )}
      </Stack>
      {/* One button per line: the Finnish phrase, then what it means in the person's language. */}
      {line.key && <CardAudioButton textKey={line.key} lang="fi" thenLang={showMeaning ? lang : undefined} label={t('ui.journey.contact.play_fi')} />}
    </Row>
  )
}

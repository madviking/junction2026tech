import { IconBook2, IconPhone } from '@tabler/icons-react'
import type { LetterExplanation } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { ActionButton, Banner, DirectionScope, Row, Stack, SurfaceCard, Text } from '@/shared/ui'

const FACTS = ['sender', 'when', 'where', 'deadline', 'phone'] as const

export interface LetterResultProps {
  letter: LetterExplanation
  onOpenGuide: (guide: NonNullable<LetterExplanation['guide']>) => void
}

/**
 * The explanation of one letter: what it is, the facts as printed (kept in the letter's own
 * language and direction so they can be compared with the paper) and what to do.
 */
export function LetterResult({ letter, onOpenGuide }: LetterResultProps) {
  const t = useT()
  const facts = FACTS.flatMap((key) => (letter[key] ? [{ key, value: letter[key] }] : []))
  const guide = letter.guide

  return (
    <Stack gap="lg">
      <Stack gap="sm">
        <Text variant="display" as="h2">
          {letter.title}
        </Text>
        <Text>{letter.summary}</Text>
      </Stack>

      {facts.length > 0 && (
        <SurfaceCard>
          <Stack gap="md">
            <Text variant="heading" as="h3">
              {t('ui.letter.facts_title')}
            </Text>
            {facts.map((fact) => (
              <Stack key={fact.key} gap="xs">
                <Text variant="caption" tone="muted">
                  {t(`ui.letter.fact_${fact.key}`)}
                </Text>
                <DirectionScope dir="ltr" lang="fi">
                  <Text variant="label">{fact.value}</Text>
                </DirectionScope>
              </Stack>
            ))}
            {letter.phone && (
              <ActionButton variant="secondary" icon={<IconPhone size={20} />} href={`tel:${letter.phone.replace(/[^\d+]/g, '')}`}>
                {t('ui.letter.call')}
              </ActionButton>
            )}
          </Stack>
        </SurfaceCard>
      )}

      {letter.actions.length > 0 && (
        <Stack gap="md">
          <Text variant="heading" as="h3">
            {t('ui.letter.actions_title')}
          </Text>
          {letter.actions.map((action, index) => (
            <Row key={action} gap="md" align="start" wrap={false}>
              <Text variant="label">{index + 1}</Text>
              <Text>{action}</Text>
            </Row>
          ))}
        </Stack>
      )}

      <Banner tone="info" title={t('ui.letter.machine_title')}>
        {t('ui.letter.machine_text')}
      </Banner>

      {guide && (
        <ActionButton fullWidth icon={<IconBook2 size={20} />} onPress={() => onOpenGuide(guide)}>
          {t(`ui.letter.guide_${guide}`)}
        </ActionButton>
      )}
    </Stack>
  )
}

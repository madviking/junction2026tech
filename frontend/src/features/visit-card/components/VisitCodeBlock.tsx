import { IconStethoscope } from '@tabler/icons-react'
import { CardAudioButton } from '@/features/voice'
import { useT } from '@/shared/i18n'
import { ActionButton, DirectionScope, Row, Stack, SurfaceCard, Text, VisuallyHidden } from '@/shared/ui'

export interface VisitCodeBlockProps {
  code: string
}

/** The anonymous visit code, large and spaced, with what to do with it and the clinician link. */
export function VisitCodeBlock({ code }: VisitCodeBlockProps) {
  const t = useT()
  const groups = code.split('-')
  return (
    <SurfaceCard as="section" padding="lg">
      <Stack gap="md">
        <Text variant="label" tone="muted" as="h2">
          {t('ui.visit.code_label')}
        </Text>
        <DirectionScope dir="ltr" lang="en">
          <Row gap="md" justify="center">
            {groups.map((group, index) => (
              <Text key={index} variant="display" as="span">
                {group}
              </Text>
            ))}
          </Row>
          {/* Read character by character, not as a word. */}
          <VisuallyHidden>{[...code.replace(/-/g, '')].join(' ')}</VisuallyHidden>
        </DirectionScope>
        <Row gap="sm" align="start" wrap={false}>
          <Text>{t('ui.visit.code_help')}</Text>
          <CardAudioButton textKey="ui.visit.code_help" label={t('ui.visit.listen')} />
        </Row>
        <Stack gap="xs">
          <ActionButton variant="secondary" fullWidth icon={<IconStethoscope size={20} aria-hidden="true" />} href={`/clinic/${code}`}>
            {t('ui.visit.clinician_link')}
          </ActionButton>
          <Text variant="caption" tone="muted">
            {t('ui.visit.clinician_help')}
          </Text>
        </Stack>
      </Stack>
    </SurfaceCard>
  )
}

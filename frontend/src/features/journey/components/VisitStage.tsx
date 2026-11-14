import { IconId } from '@tabler/icons-react'
import { useNavigate } from 'react-router'
import { StageCards } from '@/features/journey/components/StageCards'
import type { StageProps } from '@/features/journey/components/stageProps'
import { useT } from '@/shared/i18n'
import { ActionButton, Stack } from '@/shared/ui'

/** Visit: a prominent link to the visit card, then the outcome cards. */
export function VisitStage(props: StageProps) {
  const t = useT()
  const navigate = useNavigate()
  return (
    <Stack gap="lg">
      <ActionButton fullWidth icon={<IconId size={22} aria-hidden="true" />} onPress={() => navigate(props.visitCardPath)}>
        {t('ui.journey.visit.card_link')}
      </ActionButton>
      <StageCards {...props} />
    </Stack>
  )
}

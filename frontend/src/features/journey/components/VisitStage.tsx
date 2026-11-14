import { IconId } from '@tabler/icons-react'
import { useNavigate } from 'react-router'
import { StageCards } from '@/features/journey/components/StageCards'
import type { StageProps } from '@/features/journey/components/stageProps'
import { useT } from '@/shared/i18n'
import { ActionButton, PageActions } from '@/shared/ui'

/** Visit: the outcome cards, with the visit card always one tap away at the bottom of the screen. */
export function VisitStage(props: StageProps) {
  const t = useT()
  const navigate = useNavigate()
  return (
    <>
      <StageCards {...props} />
      <PageActions>
        <ActionButton fullWidth icon={<IconId size={22} aria-hidden="true" />} onPress={() => navigate(props.visitCardPath)}>
          {t('ui.journey.visit.card_link')}
        </ActionButton>
      </PageActions>
    </>
  )
}

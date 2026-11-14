import { IconMailOpened } from '@tabler/icons-react'
import { useNavigate } from 'react-router'
import { useT } from '@/shared/i18n'
import { ChoiceCard } from '@/shared/ui'

/** "I got a letter about cervical screening" → the guide. For start screens of other features. */
export function ScreeningEntryCard({ lang }: { lang: string }) {
  const t = useT()
  const navigate = useNavigate()
  return (
    <ChoiceCard
      label={t('ui.screening.entry_title')}
      detail={t('ui.screening.entry_detail')}
      icon={<IconMailOpened size={26} />}
      onPress={() => navigate(`/r/${lang}/learn/cervical`)}
    />
  )
}

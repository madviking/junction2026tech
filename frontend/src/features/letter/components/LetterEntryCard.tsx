import { IconCamera } from '@tabler/icons-react'
import { useNavigate } from 'react-router'
import { useT } from '@/shared/i18n'
import { ChoiceCard } from '@/shared/ui'

/** "I got a letter" → the photo screen. For start screens of other features. */
export function LetterEntryCard({ lang }: { lang: string }) {
  const t = useT()
  const navigate = useNavigate()
  return (
    <ChoiceCard
      label={t('ui.letter.entry_title')}
      detail={t('ui.letter.entry_detail')}
      icon={<IconCamera size={26} />}
      onPress={() => navigate(`/r/${lang}/letter`)}
    />
  )
}

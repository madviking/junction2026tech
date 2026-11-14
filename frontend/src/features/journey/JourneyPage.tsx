import { useNavigate, useParams } from 'react-router'
import { useCardMatch } from '@/features/journey/api/useCardMatch'
import { useVisit, useVisitEvent } from '@/features/journey/api/useVisit'
import { isUnknownCode } from '@/features/journey/code'
import { JourneyFrame } from '@/features/journey/components/JourneyFrame'
import { JourneyScreen } from '@/features/journey/components/JourneyScreen'
import { useT } from '@/shared/i18n'
import { ActionButton, ErrorState, LoadingState } from '@/shared/ui'

/** /r/:lang/v/:code — the current stage of an anonymous visit. The server decides every step. */
export function JourneyPage() {
  const { code = '', lang = 'en' } = useParams()
  const t = useT()
  const navigate = useNavigate()
  const visit = useVisit(code, lang)
  const event = useVisitEvent(code, lang)
  const match = useCardMatch(lang)
  const toStart = () => navigate(`/r/${lang}`)

  if (visit.isPending) {
    return (
      <JourneyFrame>
        <LoadingState label={t('ui.journey.loading')} />
      </JourneyFrame>
    )
  }
  if (visit.isError) {
    const unknown = isUnknownCode(visit.error)
    return (
      <JourneyFrame onBack={toStart}>
        <ErrorState
          title={t('ui.journey.error.title')}
          message={unknown ? t('ui.journey.error.not_found') : visit.error.message}
          onRetry={unknown ? undefined : () => void visit.refetch()}
          retryLabel={t('ui.journey.retry')}
          retrying={visit.isFetching}
        />
        <ActionButton fullWidth variant={unknown ? 'primary' : 'secondary'} onPress={toStart}>
          {t('ui.journey.error.back_start')}
        </ActionButton>
      </JourneyFrame>
    )
  }
  return (
    <JourneyScreen
      view={visit.data}
      send={(e) => event.mutate(e)}
      sending={event.isPending}
      sendFailed={event.isError}
      match={match}
      visitCardPath={`/r/${lang}/v/${code}/card`}
      aboutPath={`/r/${lang}/about`}
    />
  )
}

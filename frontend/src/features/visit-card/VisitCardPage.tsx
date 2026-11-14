import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useDeleteVisit, useVisitCard } from '@/features/visit-card/api/useVisitCard'
import { DeleteVisitAction } from '@/features/visit-card/components/DeleteVisitAction'
import { NextStepsList } from '@/features/visit-card/components/NextStepsList'
import { VisitCodeBlock } from '@/features/visit-card/components/VisitCodeBlock'
import { VisitSummary } from '@/features/visit-card/components/VisitSummary'
import { APIError, ErrCode } from '@/shared/api/client'
import { useContent } from '@/shared/i18n'
import { EmergencyCallLink, ErrorState, LoadingState, PageShell, Stack } from '@/shared/ui'

/** /r/:lang/v/:code/card — the resident's visit card in their own language. */
export function VisitCardPage() {
  const { code = '' } = useParams()
  const { t, lang } = useContent()
  const navigate = useNavigate()
  const visit = useVisitCard(code, lang)
  const remove = useDeleteVisit(code)

  const onDelete = () => remove.mutate(undefined, { onSuccess: () => navigate('/') })
  const back = useMemo(
    () => ({ label: t('ui.visit.back'), onPress: () => navigate(`/r/${lang}/v/${code}`) }),
    [t, navigate, lang, code],
  )
  const notFound = visit.error instanceof APIError && visit.error.code === ErrCode.NotFound

  return (
    <PageShell
      title={t('ui.visit.title')}
      back={back}
      emergency={<EmergencyCallLink compact label={t('ui.visit.emergency')} phoneNumber="112" />}
    >
      <Stack gap="lg">
        {visit.isPending && <LoadingState label={t('ui.visit.loading')} />}
        {visit.isError && (
          <ErrorState
            title={t('ui.visit.error_title')}
            message={notFound ? t('ui.visit.not_found') : visit.error.message}
            onRetry={() => visit.refetch()}
            retryLabel={t('ui.visit.retry')}
            retrying={visit.isRefetching}
          />
        )}
        {visit.data && (
          <>
            <VisitCodeBlock code={visit.data.code} />
            <NextStepsList steps={visit.data.nextSteps} onRefresh={() => visit.refetch()} refreshing={visit.isRefetching} />
            <VisitSummary view={visit.data} />
            <DeleteVisitAction onConfirm={onDelete} pending={remove.isPending} failed={remove.isError} />
          </>
        )}
      </Stack>
    </PageShell>
  )
}

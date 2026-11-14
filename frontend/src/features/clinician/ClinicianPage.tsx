import { IconSend } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useClinicianSummary, useSendClinicianAnswers } from '@/features/clinician/api/useClinicianSummary'
import { AnswerCards } from '@/features/clinician/components/AnswerCards'
import { SummaryPanel } from '@/features/clinician/components/SummaryPanel'
import { APIError, ErrCode } from '@/shared/api/client'
import { useT } from '@/shared/i18n'
import { ActionButton, Banner, ErrorState, LoadingState, PageShell, Section, Stack, SurfaceCard } from '@/shared/ui'

/** /clinic/:code — one Finnish screen for the doctor or nurse, plus the answer cards. */
export function ClinicianPage() {
  const { code = '' } = useParams()
  const t = useT()
  const navigate = useNavigate()
  const summary = useClinicianSummary(code)
  const send = useSendClinicianAnswers(code)
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set())

  const toggle = (outcome: string) => {
    send.reset()
    setChosen((current) => {
      const next = new Set(current)
      if (next.has(outcome)) next.delete(outcome)
      else next.add(outcome)
      return next
    })
  }

  const confirm = () => {
    // Keep the card order of the summary (the stage's outcome order).
    const answers = (summary.data?.answerCards ?? []).map((c) => c.outcome).filter((o) => chosen.has(o))
    send.mutate(answers, { onSuccess: () => setChosen(new Set()) })
  }

  const back = useMemo(() => ({ label: t('ui.clinician.back'), onPress: () => navigate('/clinic') }), [t, navigate])
  const notFound = summary.error instanceof APIError && summary.error.code === ErrCode.NotFound

  return (
    <PageShell title={t('ui.clinician.title')} back={back}>
      <Stack gap="lg">
        {summary.isPending && <LoadingState label={t('ui.clinician.loading')} />}
        {summary.isError && (
          <ErrorState
            title={t('ui.clinician.error_title')}
            message={notFound ? t('ui.clinician.not_found') : summary.error.message}
            onRetry={() => summary.refetch()}
            retryLabel={t('ui.clinician.retry')}
            retrying={summary.isRefetching}
          />
        )}
        {summary.data && (
          <>
            <SummaryPanel summary={summary.data} />
            <SurfaceCard>
              <Section title={t('ui.clinician.answers_title')} description={t('ui.clinician.answers_help')} level={2}>
                <Stack gap="md">
                  <AnswerCards cards={summary.data.answerCards} chosen={chosen} onToggle={toggle} disabled={send.isPending} />
                  {send.isSuccess && (
                    <Banner tone="success" title={t('ui.clinician.sent')}>
                      {t('ui.clinician.sent_text')}
                    </Banner>
                  )}
                  {send.isError && (
                    <Banner tone="warning" title={t('ui.clinician.send_failed')}>
                      {send.error.message}
                    </Banner>
                  )}
                  <ActionButton
                    fullWidth
                    icon={<IconSend size={20} aria-hidden="true" />}
                    loading={send.isPending}
                    disabled={chosen.size === 0}
                    onPress={confirm}
                  >
                    {t('ui.clinician.confirm')}
                  </ActionButton>
                </Stack>
              </Section>
            </SurfaceCard>
          </>
        )}
      </Stack>
    </PageShell>
  )
}

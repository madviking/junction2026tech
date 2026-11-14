import { useState, type ReactNode } from 'react'
import { RouteChoices } from '@/features/journey/components/RouteChoices'
import { StageQuestion } from '@/features/journey/components/StageQuestion'
import { SymptomPicker } from '@/features/journey/components/SymptomPicker'
import type { StageProps } from '@/features/journey/components/stageProps'
import { stageAskKey } from '@/features/journey/keys'
import { useSubStepBack } from '@/features/journey/subStepBack'
import { useT } from '@/shared/i18n'
import { ActionButton, Stack, TextField } from '@/shared/ui'

export interface OutcomeChooserProps extends StageProps {
  /** Renders the stage; call `choose(outcomeId)` when the person taps an outcome. */
  children: (choose: (outcomeId: string) => void) => ReactNode
}

/**
 * Turns a tapped outcome into an event, driven by the content structure: an outcome with
 * `sets: 'lane'` first asks for symptom cards, one with `sets: 'route'` for a route card;
 * every other outcome is sent as is. Works for any stage, so new outcomes need no code.
 */
export function OutcomeChooser({ view, send, sending, match, children }: OutcomeChooserProps) {
  const t = useT()
  const [needs, setNeeds] = useState<{ outcome: string; sets: 'lane' | 'route' | 'visit_date' } | null>(null)
  const [visitDate, setVisitDate] = useState('')
  // The symptom picker handles its own back (it has two inner steps); the date and route asks use this.
  const inHeader = useSubStepBack(needs && needs.sets !== 'lane' && !sending ? () => setNeeds(null) : undefined)

  const choose = (outcomeId: string) => {
    const outcome = view.stage.outcomes.find((o) => o.id === outcomeId)
    if (outcome?.sets === 'lane' || outcome?.sets === 'route') setNeeds({ outcome: outcomeId, sets: outcome.sets })
    else if (outcome?.records === 'visit_date') setNeeds({ outcome: outcomeId, sets: 'visit_date' })
    else send({ outcome: outcomeId })
  }

  // An outcome that records the visit date asks for it; the date is optional.
  if (needs?.sets === 'visit_date') {
    return (
      <Stack gap="lg">
        <TextField
          type="date"
          label={t('ui.journey.visit_date.label')}
          description={t('ui.journey.visit_date.hint')}
          value={visitDate}
          onChange={setVisitDate}
        />
        <ActionButton fullWidth disabled={sending} loading={sending} onPress={() => send({ outcome: needs.outcome, ...(visitDate ? { visitDate } : {}) })}>
          {visitDate ? t('ui.journey.visit_date.save') : t('ui.journey.visit_date.skip')}
        </ActionButton>
        {!inHeader && (
          <ActionButton fullWidth variant="subtle" disabled={sending} onPress={() => setNeeds(null)}>
            {t('ui.journey.symptom.cancel')}
          </ActionButton>
        )}
      </Stack>
    )
  }

  if (needs?.sets === 'lane') {
    return (
      <SymptomPicker
        symptoms={view.symptoms}
        durations={view.durations}
        match={match}
        sending={sending}
        onConfirm={(symptoms, duration) => send({ outcome: needs.outcome, symptoms, ...(duration ? { duration } : {}) })}
        onCancel={() => setNeeds(null)}
      />
    )
  }
  if (needs?.sets === 'route') {
    return (
      <Stack gap="lg">
        {view.ask && <StageQuestion text={view.ask} textKey={stageAskKey(view.stage.id)} />}
        <RouteChoices match={match} disabled={sending} onRoute={(route) => send({ outcome: needs.outcome, route })} />
        {!inHeader && (
          <ActionButton fullWidth variant="subtle" disabled={sending} onPress={() => setNeeds(null)}>
            {t('ui.journey.symptom.cancel')}
          </ActionButton>
        )}
      </Stack>
    )
  }
  return <>{children(choose)}</>
}

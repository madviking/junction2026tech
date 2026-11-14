import { useId, useState } from 'react'
import { glossaryAnswerKey, matchCardKey } from '@/features/journey/keys'
import type { MatchAnswer, MatchFn, MatchOption, MatchSet } from '@/features/journey/types'
import { CardAudioButton, RecordAnswerButton } from '@/features/voice'
import { useT } from '@/shared/i18n'
import { ActionButton, PageActions, Row, Stack, SurfaceCard, Text, TextField } from '@/shared/ui'

export interface MatchInputProps {
  set: MatchSet
  /** Journey stage id; required for the `outcomes` set. */
  stage?: string
  match: MatchFn
  /** Called only after the person confirmed the read-back with Yes. */
  onChosen: (id: string) => void
  disabled?: boolean
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'readback'; top: MatchOption }
  | { kind: 'answer'; answer: MatchAnswer }
  | { kind: 'choose' }
  | { kind: 'error' }

/**
 * Free text or voice → one card of a closed set. A confident match is read back
 * ("Did you mean …?") and chosen only on Yes; anything else leaves the cards on screen to
 * tap. A question about a Finnish health care word ("what is a Kela card?") gets a short
 * answer card; the step's cards stay on screen. Never chooses on its own.
 */
export function MatchInput({ set, stage, match, onChosen, disabled }: MatchInputProps) {
  const t = useT()
  const readbackId = useId()
  const answerId = useId()
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })

  const run = async (input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return
    setPhase({ kind: 'pending' })
    try {
      const result = await match({ text: trimmed, set, stage })
      if (result.status === 'confirm' && result.top) setPhase({ kind: 'readback', top: result.top })
      else if (result.status === 'answer' && result.answer) setPhase({ kind: 'answer', answer: result.answer })
      else setPhase({ kind: 'choose' })
    } catch {
      setPhase({ kind: 'error' })
    }
  }

  const onTranscript = (transcript: string) => {
    setText(transcript)
    void run(transcript)
  }

  const confirm = (id: string) => {
    setPhase({ kind: 'idle' })
    setText('')
    onChosen(id)
  }

  const dismissAnswer = () => {
    setPhase({ kind: 'idle' })
    setText('')
  }

  const busy = disabled || phase.kind === 'pending'

  // Speaking and typing live in the bottom bar on every screen, above the screen's main action.
  return (
    <PageActions>
      <Stack gap="sm">
        <div role="status" aria-live="polite">
          {phase.kind === 'readback' && (
            <SurfaceCard tone="muted">
              <div role="group" aria-labelledby={readbackId}>
                <Stack gap="sm">
                  <Row gap="sm" align="center" justify="between" wrap={false}>
                    <Text variant="label" id={readbackId}>
                      {t('ui.journey.match.readback', { text: phase.top.text })}
                    </Text>
                    <CardAudioButton textKey={matchCardKey(set, phase.top.id, stage)} />
                  </Row>
                  <Row gap="sm" grow>
                    <ActionButton disabled={disabled} onPress={() => confirm(phase.top.id)}>
                      {t('ui.journey.match.yes')}
                    </ActionButton>
                    <ActionButton variant="secondary" onPress={() => setPhase({ kind: 'choose' })}>
                      {t('ui.journey.match.no')}
                    </ActionButton>
                  </Row>
                </Stack>
              </div>
            </SurfaceCard>
          )}
          {phase.kind === 'answer' && (
            <SurfaceCard tone="muted">
              <div role="group" aria-labelledby={answerId}>
                <Stack gap="sm">
                  <Text variant="label" id={answerId}>
                    {phase.answer.question}
                  </Text>
                  <Row gap="sm" align="start" justify="between" wrap={false}>
                    <Text>{phase.answer.text}</Text>
                    <CardAudioButton textKey={glossaryAnswerKey(phase.answer.id)} />
                  </Row>
                  <Text tone="muted">{t('ui.journey.match.answer_next')}</Text>
                  <Row gap="sm" grow>
                    <ActionButton variant="secondary" onPress={dismissAnswer}>
                      {t('ui.journey.match.answer_ok')}
                    </ActionButton>
                  </Row>
                </Stack>
              </div>
            </SurfaceCard>
          )}
          {phase.kind === 'choose' && <Text tone="muted">{t('ui.journey.match.choose')}</Text>}
          {phase.kind === 'error' && <Text tone="danger">{t('ui.journey.match.error')}</Text>}
        </div>
        <Row gap="sm" align="center" wrap={false} growFirst>
          <TextField hideLabel label={t('ui.journey.match.label')} value={text} onChange={setText} disabled={disabled} />
          <RecordAnswerButton compact onTranscript={onTranscript} disabled={busy} />
        </Row>
        {(text.trim() || phase.kind === 'pending') && (
          <ActionButton variant="secondary" fullWidth loading={phase.kind === 'pending'} disabled={busy} onPress={() => void run(text)}>
            {t('ui.journey.match.submit')}
          </ActionButton>
        )}
      </Stack>
    </PageActions>
  )
}

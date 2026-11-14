import { useId, useState } from 'react'
import { matchCardKey } from '@/features/journey/keys'
import type { MatchFn, MatchOption, MatchSet } from '@/features/journey/types'
import { CardAudioButton, RecordAnswerButton } from '@/features/voice'
import { useT } from '@/shared/i18n'
import { ActionButton, Row, Stack, SurfaceCard, Text, TextField } from '@/shared/ui'

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
  | { kind: 'choose' }
  | { kind: 'error' }

/**
 * Free text or voice → one card of a closed set. A confident match is read back
 * ("Did you mean …?") and chosen only on Yes; anything else leaves the cards on screen to
 * tap. Never chooses on its own.
 */
export function MatchInput({ set, stage, match, onChosen, disabled }: MatchInputProps) {
  const t = useT()
  const readbackId = useId()
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })

  const run = async (input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return
    setPhase({ kind: 'pending' })
    try {
      const result = await match({ text: trimmed, set, stage })
      setPhase(result.status === 'confirm' && result.top ? { kind: 'readback', top: result.top } : { kind: 'choose' })
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

  const busy = disabled || phase.kind === 'pending'

  return (
    <Stack gap="sm">
      <TextField label={t('ui.journey.match.label')} value={text} onChange={setText} disabled={disabled} />
      <Row gap="md" align="center">
        <ActionButton variant="secondary" loading={phase.kind === 'pending'} disabled={busy || !text.trim()} onPress={() => void run(text)}>
          {t('ui.journey.match.submit')}
        </ActionButton>
        <RecordAnswerButton onTranscript={onTranscript} disabled={busy} />
      </Row>
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
        {phase.kind === 'choose' && <Text tone="muted">{t('ui.journey.match.choose')}</Text>}
        {phase.kind === 'error' && <Text tone="danger">{t('ui.journey.match.error')}</Text>}
      </div>
    </Stack>
  )
}

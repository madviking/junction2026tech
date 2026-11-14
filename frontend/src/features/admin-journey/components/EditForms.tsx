import { useState } from 'react'
import { ActionButton, Banner, CheckboxField, Row, Stack, Text, TextAreaField, TextField } from '@/shared/ui'
import { NextStageField } from '@/features/admin-journey/components/NextStageField'
import { nextStageId, OTHER_STAGE, type NextStageValue } from '@/features/admin-journey/lib/nextStage'
import { idProblem } from '@/features/admin-journey/lib/layout'

interface FormBase {
  submitting: boolean
  error: string | null
  onCancel: () => void
}

function Actions({ submitting, onCancel, onSubmit, label }: { submitting: boolean; onCancel: () => void; onSubmit: () => void; label: string }) {
  return (
    <Row gap="xs">
      <ActionButton compact loading={submitting} onPress={onSubmit}>
        {label}
      </ActionButton>
      <ActionButton variant="secondary" compact onPress={onCancel}>
        Cancel
      </ActionButton>
    </Row>
  )
}

const ServerError = ({ error }: { error: string | null }) => (error ? <Banner tone="warning" title="Not saved">{error}</Banner> : null)
const required = (text: string) => (text.trim() ? null : 'Required')

export interface AddStageFormProps extends FormBase {
  takenIds: string[]
  onSubmit: (input: { id: string; terminal: boolean; askEn: string; askFi: string }) => void
}

/** New stage: id, question in English and Finnish (none for a terminal stage). */
export function AddStageForm({ takenIds, onSubmit, submitting, error, onCancel }: AddStageFormProps) {
  const [id, setId] = useState('')
  const [terminal, setTerminal] = useState(false)
  const [askEn, setAskEn] = useState('')
  const [askFi, setAskFi] = useState('')
  const [tried, setTried] = useState(false)
  const problems = { id: idProblem(id, takenIds), askEn: terminal ? null : required(askEn), askFi: terminal ? null : required(askFi) }
  const submit = () => {
    setTried(true)
    if (Object.values(problems).some(Boolean)) return
    onSubmit({ id, terminal, askEn: terminal ? '' : askEn, askFi: terminal ? '' : askFi })
  }
  return (
    <Stack gap="md">
      <Text tone="muted">The stage is added to the draft before “closed”. Give it at least one outcome, and let an outcome lead to it.</Text>
      <TextField label="Stage id" description="Lowercase letters, digits and _, e.g. second_opinion" value={id} onChange={setId} error={tried ? problems.id : null} required />
      <CheckboxField label="Terminal stage (ends the journey, no question)" checked={terminal} onChange={setTerminal} />
      {!terminal && (
        <>
          <TextAreaField label="Question (English)" value={askEn} onChange={setAskEn} rows={2} error={tried ? problems.askEn : null} required />
          <TextAreaField label="Question (Finnish)" value={askFi} onChange={setAskFi} rows={2} error={tried ? problems.askFi : null} required />
          <Text variant="caption" tone="muted">
            Somali and Arabic are added later in the content editor.
          </Text>
        </>
      )}
      <ServerError error={error} />
      <Actions submitting={submitting} onCancel={onCancel} onSubmit={submit} label="Add stage" />
    </Stack>
  )
}

export interface AddOutcomeFormProps extends FormBase {
  stage: string
  stageIds: string[]
  takenIds: string[]
  onSubmit: (input: { stage: string; id: string; next: string; cardEn: string; cardFi: string }) => void
}

/** New outcome card of a stage: id, card text in English and Finnish, where it leads. */
export function AddOutcomeForm({ stage, stageIds, takenIds, onSubmit, submitting, error, onCancel }: AddOutcomeFormProps) {
  const [id, setId] = useState('')
  const [cardEn, setCardEn] = useState('')
  const [cardFi, setCardFi] = useState('')
  const [next, setNext] = useState<NextStageValue>({ choice: null, other: '' })
  const [tried, setTried] = useState(false)
  const target = nextStageId(next)
  const problems = { id: idProblem(id, takenIds), cardEn: required(cardEn), cardFi: required(cardFi), next: target ? idProblem(target, []) : 'Required' }
  const submit = () => {
    setTried(true)
    if (Object.values(problems).some(Boolean)) return
    onSubmit({ stage, id, next: target, cardEn, cardFi })
  }
  return (
    <Stack gap="md">
      <TextField label="Outcome id" description="Lowercase letters, digits and _, e.g. moved_away" value={id} onChange={setId} error={tried ? problems.id : null} required />
      <TextAreaField label="Card text (English)" value={cardEn} onChange={setCardEn} rows={2} error={tried ? problems.cardEn : null} required />
      <TextAreaField label="Card text (Finnish)" value={cardFi} onChange={setCardFi} rows={2} error={tried ? problems.cardFi : null} required />
      <NextStageField stageIds={stageIds} value={next} onChange={setNext} error={tried ? problems.next : null} />
      <ServerError error={error} />
      <Actions submitting={submitting} onCancel={onCancel} onSubmit={submit} label="Add outcome" />
    </Stack>
  )
}

export interface SetNextFormProps extends FormBase {
  card: string
  current: string
  stageIds: string[]
  onSubmit: (next: string) => void
}

/** Change where one outcome leads. */
export function SetNextForm({ card, current, stageIds, onSubmit, submitting, error, onCancel }: SetNextFormProps) {
  const [next, setNext] = useState<NextStageValue>(stageIds.includes(current) ? { choice: current, other: '' } : { choice: OTHER_STAGE, other: current })
  const [tried, setTried] = useState(false)
  const target = nextStageId(next)
  const problem = target ? idProblem(target, []) : 'Required'
  const submit = () => {
    setTried(true)
    if (!problem) onSubmit(target)
  }
  return (
    <Stack gap="md">
      <Text>{card}</Text>
      <Text variant="caption" tone="muted">{`Now leads to ${current}.`}</Text>
      <NextStageField stageIds={stageIds} value={next} onChange={setNext} error={tried ? problem : null} />
      <ServerError error={error} />
      <Actions submitting={submitting} onCancel={onCancel} onSubmit={submit} label="Save" />
    </Stack>
  )
}

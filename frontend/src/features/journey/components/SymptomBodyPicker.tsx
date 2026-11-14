import { useState } from 'react'
import { symptomKey } from '@/features/journey/keys'
import { REGION_ORDER, regionLabelKey, visualFor } from '@/features/journey/symptomVisuals'
import type { SymptomOption } from '@/features/journey/types'
import { CardAudioButton } from '@/features/voice'
import { useContent } from '@/shared/i18n'
import { BodyMap, type BodyRegionId, ChoiceCard, Grid, Stack } from '@/shared/ui'

export interface SymptomBodyPickerProps {
  symptoms: SymptomOption[]
  chosen: string[]
  disabled: boolean
  onToggle: (symptomId: string) => void
}

/**
 * The picture version of the symptom cards for people who struggle with written text:
 * a neutral body map narrows the cards to one body part, and each card is a big picture
 * with its text and listen button. No body part chosen = every card shown.
 */
export function SymptomBodyPicker({ symptoms, chosen, disabled, onToggle }: SymptomBodyPickerProps) {
  const { t } = useContent()
  const [region, setRegion] = useState<BodyRegionId | null>(null)

  const used = new Set(symptoms.flatMap((s) => visualFor(s.id).regions))
  const regions = REGION_ORDER.filter((r) => used.has(r)).map((id) => ({ id, label: t(regionLabelKey(id)) }))
  const shown = region ? symptoms.filter((s) => visualFor(s.id).regions.includes(region)) : symptoms

  return (
    <Stack gap="md">
      <BodyMap label={t('ui.journey.body.label')} regions={regions} value={region} onChange={setRegion} disabled={disabled} />
      <Grid min="xs" gap="sm">
        {shown.map((symptom) => {
          const PictureIcon = visualFor(symptom.id).icon
          return (
            <ChoiceCard
              key={symptom.id}
              layout="tile"
              icon={<PictureIcon size={40} stroke={1.6} />}
              label={symptom.text}
              selected={chosen.includes(symptom.id)}
              disabled={disabled}
              onPress={() => onToggle(symptom.id)}
              trailing={<CardAudioButton textKey={symptomKey(symptom.id, 'card')} />}
            />
          )
        })}
      </Grid>
    </Stack>
  )
}

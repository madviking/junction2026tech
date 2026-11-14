import { IconCircleDot, IconHeartbeat, IconLungs, IconMapPin, IconStethoscope } from '@tabler/icons-react'
import { useState } from 'react'
import {
  ActionButton,
  AudioPlayButton,
  Banner,
  BodyMap,
  type BodyMapRegion,
  type BodyRegionId,
  ChoiceCard,
  Divider,
  EmergencyCallLink,
  EmptyState,
  ErrorState,
  Grid,
  IconText,
  LoadingState,
  PlaceholderNotice,
  RecordButton,
  Row,
  Section,
  Stack,
  StatTile,
  StepList,
  Text,
  type StepItem,
} from '@/shared/ui'
import { noop } from '@/features/design-system/sections/noop'
import { ResidentFrame } from '@/features/design-system/sections/ResidentFrame'
import { Specimen, StateLabel } from '@/features/design-system/sections/Specimen'

const steps: StepItem[] = [
  { id: 'describe', title: 'Describe what you noticed', status: 'done' },
  { id: 'door', title: 'Find the right door', detail: 'Health centre, Kallio. Open today until 16:00.', status: 'current' },
  { id: 'card', title: 'Show your visit card', status: 'upcoming' },
]

const bodyRegions: BodyMapRegion[] = [
  { id: 'head', label: 'Head and neck' },
  { id: 'chest', label: 'Chest, breast and armpit' },
  { id: 'belly', label: 'Belly and lower body' },
  { id: 'skin', label: 'Skin' },
  { id: 'whole', label: 'Whole body' },
]

export function ResidentPrimitivesSection() {
  const [choice, setChoice] = useState<string>('lump')
  const [region, setRegion] = useState<BodyRegionId | null>('chest')
  return (
    <Section eyebrow="Resident" title="Resident primitives" description="Mobile-first, 48px touch targets.">
      <Specimen title="Text tones">
        <Stack gap="xs">
          <Text>default: body text</Text>
          <Text tone="muted">muted: supporting text</Text>
          <Text tone="primary">primary</Text>
          <Text tone="info">info</Text>
          <Text tone="success">success</Text>
          <Text tone="warning">warning</Text>
          <Text tone="danger">danger</Text>
          <Text tone="emergency">emergency</Text>
          <Text eyebrow variant="caption" tone="muted">
            eyebrow caption
          </Text>
        </Stack>
      </Specimen>

      <Specimen title="ActionButton">
        <Stack gap="sm">
          <Row>
            <ActionButton>Primary</ActionButton>
            <ActionButton variant="secondary">Secondary</ActionButton>
            <ActionButton variant="danger">Danger</ActionButton>
            <ActionButton variant="subtle">Subtle</ActionButton>
          </Row>
          <StateLabel>disabled / loading / icon / compact</StateLabel>
          <Row>
            <ActionButton disabled>Disabled</ActionButton>
            <ActionButton loading>Loading</ActionButton>
            <ActionButton variant="secondary" icon={<IconMapPin size={20} />}>
              With icon
            </ActionButton>
            <ActionButton compact variant="secondary">
              Compact (admin)
            </ActionButton>
          </Row>
          <StateLabel>full width</StateLabel>
          <ActionButton fullWidth>Continue</ActionButton>
        </Stack>
      </Specimen>

      <Specimen title="ChoiceCard">
        <Stack gap="sm">
          <ChoiceCard
            label="I noticed a lump"
            detail="Breast, armpit, neck or elsewhere"
            icon={<IconStethoscope size={28} />}
            selected={choice === 'lump'}
            onPress={() => setChoice('lump')}
            trailing={<AudioPlayButton state="idle" label="Listen: I noticed a lump" onPress={noop} />}
          />
          <ChoiceCard
            label="Bleeding that is new to me"
            icon={<IconHeartbeat size={28} />}
            selected={choice === 'bleeding'}
            onPress={() => setChoice('bleeding')}
          />
          <ChoiceCard label="Disabled choice" detail="Not available yet" disabled selected={false} onPress={noop} />
        </Stack>
      </Specimen>

      <Specimen title="BodyMap and ChoiceCard layout=tile (picture symptom picker)">
        <Stack gap="md">
          <BodyMap
            label="Where do you feel it?"
            regions={bodyRegions}
            value={region}
            onChange={setRegion}
          />
          <Grid min="xs" gap="sm">
            <ChoiceCard
              layout="tile"
              label="A new lump or swelling"
              icon={<IconCircleDot size={40} stroke={1.6} />}
              selected
              onPress={noop}
              trailing={<AudioPlayButton state="idle" label="Listen: A new lump or swelling" onPress={noop} />}
            />
            <ChoiceCard
              layout="tile"
              label="A cough for over 3 weeks"
              icon={<IconLungs size={40} stroke={1.6} />}
              selected={false}
              onPress={noop}
              trailing={<AudioPlayButton state="idle" label="Listen: A cough for over 3 weeks" onPress={noop} />}
            />
          </Grid>
        </Stack>
      </Specimen>

      <Grid min="sm">
        <Specimen title="AudioPlayButton">
          <Row gap="md">
            {(['idle', 'loading', 'playing', 'error'] as const).map((state) => (
              <Stack key={state} gap="xs" align="center">
                <AudioPlayButton state={state} label={`Listen (${state})`} onPress={noop} />
                <StateLabel>{state}</StateLabel>
              </Stack>
            ))}
          </Row>
        </Specimen>
        <Specimen title="EmergencyCallLink">
          <EmergencyCallLink label="Emergency? Call" phoneNumber="112" />
        </Specimen>
      </Grid>

      <Specimen title="RecordButton">
        <Row gap="xl" align="start">
          <RecordButton state="idle" label="Tap to speak" onPress={noop} />
          <RecordButton state="recording" label="Stop recording" elapsedSeconds={12} onPress={noop} />
          <RecordButton state="processing" label="Processing" onPress={noop} />
          <RecordButton state="disabled" label="Microphone off" onPress={noop} />
        </Row>
      </Specimen>

      <Specimen title="Banner">
        <Banner tone="info" title="Good to know">
          Screening is free for women aged 50 to 69.
        </Banner>
        <Banner tone="success" title="Visit card ready">
          Show it at the reception.
        </Banner>
        <Banner tone="warning" title="Check this soon" action={<ActionButton variant="secondary">Find a clinic</ActionButton>}>
          Book a visit within two weeks.
        </Banner>
        <Banner
          tone="emergency"
          title="Call 112 now"
          action={<ActionButton variant="secondary" href="tel:112">Call 112</ActionButton>}
        >
          Heavy bleeding or trouble breathing needs emergency care.
        </Banner>
      </Specimen>

      <Grid min="md">
        <Specimen title="StepList">
          <StepList steps={steps} />
        </Specimen>
        <Specimen title="StatTile">
          <Grid min="xs" gap="sm">
            <StatTile label="Screening reach" value="64%" delta="+5 pts vs 2025" deltaTone="success" />
            <StatTile label="Missed invitations" value="1,204" delta="+12%" deltaTone="danger" note="Somali speakers" />
          </Grid>
        </Specimen>
      </Grid>

      <Grid min="md">
        <Specimen title="LoadingState">
          <LoadingState label="Loading clinics" />
        </Specimen>
        <Specimen title="EmptyState">
          <EmptyState
            title="No clinics nearby"
            description="Try a different postcode."
            action={<ActionButton variant="secondary">Change postcode</ActionButton>}
          />
        </Specimen>
        <Specimen title="ErrorState">
          <ErrorState title="Could not load clinics" message="Check your connection and try again." onRetry={noop} />
        </Specimen>
      </Grid>

      <Specimen title="Layout helpers, IconText, Divider, PlaceholderNotice">
        <Stack gap="sm">
          <IconText icon={<IconMapPin size={20} />}>Kallio health centre</IconText>
          <IconText icon={<IconStethoscope size={20} />} tone="muted" variant="caption">
            Nurse appointment
          </IconText>
          <Divider />
          <Divider label="or" />
          <Row>
            <PlaceholderNotice>Unchecked translation</PlaceholderNotice>
          </Row>
        </Stack>
      </Specimen>

      <Specimen title="PageShell">
        <ResidentFrame />
      </Specimen>
    </Section>
  )
}

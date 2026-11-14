import { IconStethoscope } from '@tabler/icons-react'
import {
  ActionButton,
  AudioPlayButton,
  Banner,
  ChoiceCard,
  DirectionScope,
  PlaceholderNotice,
  Row,
  Section,
  Stack,
  StatusBadge,
  StepList,
  type StepItem,
} from '@/shared/ui'
import { noop } from '@/features/design-system/sections/noop'
import { ResidentFrame } from '@/features/design-system/sections/ResidentFrame'

const STATUS_LABELS_AR = { done: 'تم', current: 'الخطوة الحالية', upcoming: 'قادمة' }

const stepsAr: StepItem[] = [
  { id: 'describe', title: 'صف ما لاحظته', status: 'done' },
  { id: 'door', title: 'اعثر على المكان المناسب', detail: 'المركز الصحي مفتوح اليوم', status: 'current' },
  { id: 'card', title: 'أظهر بطاقة الزيارة', status: 'upcoming' },
]

export function RtlSection() {
  return (
    <Section
      eyebrow="Direction"
      title="RTL sample"
      description="Arabic in a dir=rtl scope. Layout, icons and the drawer side follow the writing direction."
    >
      <DirectionScope dir="rtl" lang="ar">
        <Stack gap="md">
          <Banner tone="warning" title="راجع الطبيب قريبًا" action={<ActionButton variant="secondary">ابحث عن عيادة</ActionButton>}>
            احجز موعدًا خلال أسبوعين.
          </Banner>
          <ChoiceCard
            label="لاحظت كتلة"
            detail="في الثدي أو الإبط أو الرقبة"
            icon={<IconStethoscope size={28} />}
            selected
            trailing={<AudioPlayButton state="playing" label="إيقاف" onPress={noop} />}
          />
          <StepList steps={stepsAr} statusLabels={STATUS_LABELS_AR} />
          <Row>
            <StatusBadge tone="success">موافق عليه</StatusBadge>
            <PlaceholderNotice>ترجمة غير مدققة</PlaceholderNotice>
          </Row>
          <ResidentFrame rtl />
        </Stack>
      </DirectionScope>
    </Section>
  )
}

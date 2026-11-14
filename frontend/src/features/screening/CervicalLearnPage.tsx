import {
  IconArrowLeft,
  IconArrowRight,
  IconCalendarRepeat,
  IconConfetti,
  IconDoorEnter,
  IconFileText,
  IconMail,
  IconMailOpened,
  IconRefresh,
  IconRoute,
} from '@tabler/icons-react'
import { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { cervicalCourse, type CoursePart, type CourseSlide } from '@/features/screening/cervicalCourse'
import { AppointmentHelp } from '@/features/screening/components/AppointmentHelp'
import { CardAudioButton } from '@/features/voice'
import { useT } from '@/shared/i18n'
import {
  ActionButton,
  Checklist,
  DirectionalIcon,
  ChoiceCard,
  EmergencyCallLink,
  FaqItem,
  LessonProgress,
  LessonScene,
  PageShell,
  PhraseCard,
  Row,
  Stack,
  SurfaceCard,
  Text,
  TimelineStrip,
} from '@/shared/ui'

const L = 'ui.screening.learn'
const DONE_ACCENTS = [IconMail, IconCalendarRepeat]
const INTRO_ACCENTS = [IconDoorEnter, IconCalendarRepeat]

/**
 * `/r/:lang/learn/cervical` — the visual guide a screening letter's QR code opens:
 * overview → five parts (why, the visit, your rights, after, questions) → done.
 * The current part is the `?part=` search parameter, so the phone's back button works.
 */
export function CervicalLearnPage() {
  const { lang = 'en' } = useParams()
  const t = useT()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const partId = params.get('part')
  const index = cervicalCourse.findIndex((part) => part.id === partId)
  const part = index >= 0 ? cervicalCourse[index] : undefined
  const done = partId === 'done'

  useEffect(() => {
    if (!navigator.userAgent.includes('jsdom')) window.scrollTo({ top: 0 })
  }, [partId])

  const go = (next: string | null) => setParams(next ? { part: next } : {})
  const goIndex = (i: number) => go(i < 0 ? null : (cervicalCourse[i]?.id ?? 'done'))

  const shell = (content: React.ReactNode, bottom?: React.ReactNode) => (
    <PageShell
      title={t(`${L}.title`)}
      back={{ label: t(`${L}.back`), onPress: () => (part || done ? goIndex(done ? cervicalCourse.length - 1 : index - 1) : navigate(`/r/${lang}`)) }}
      emergency={<EmergencyCallLink compact label={t('ui.language.emergency_call')} phoneNumber="112" />}
      bottomActions={bottom}
    >
      {content}
    </PageShell>
  )

  if (done) {
    return shell(
      <Stack gap="lg">
        <LessonScene icon={IconConfetti} accents={DONE_ACCENTS} tone="success" />
        <Text variant="title" as="h2">
          {t(`${L}.done_title`)}
        </Text>
        <Text>{t(`${L}.done_body`)}</Text>
        <Stack gap="sm">
          <ActionButton fullWidth icon={<IconFileText size={20} />} onPress={() => navigate(`/letter/cervical/${lang}`)}>
            {t(`${L}.to_letter`)}
          </ActionButton>
          <ActionButton fullWidth variant="secondary" icon={<IconRoute size={20} />} onPress={() => navigate(`/r/${lang}`)}>
            {t(`${L}.to_silta`)}
          </ActionButton>
          <ActionButton fullWidth variant="subtle" icon={<IconRefresh size={20} />} onPress={() => go(null)}>
            {t(`${L}.restart`)}
          </ActionButton>
        </Stack>
      </Stack>,
    )
  }

  if (!part) {
    return shell(
      <Stack gap="lg">
        <LessonScene icon={IconMailOpened} accents={INTRO_ACCENTS} />
        <Row gap="sm" align="center" justify="between" wrap={false}>
          <Text>{t(`${L}.intro`)}</Text>
          <CardAudioButton textKey={`${L}.intro`} />
        </Row>
        <TimelineStrip
          steps={(['letter', 'visit', 'result', 'next'] as const).map((step) => ({
            icon: timelineIcon[step],
            label: t(`${L}.timeline.${step}`),
            detail: t(`${L}.timeline.${step}_detail`),
          }))}
        />
        <AppointmentHelp lang={lang} />
        <Stack gap="sm">
          <Text variant="heading" as="h2">
            {t(`${L}.parts_title`)}
          </Text>
          {cervicalCourse.map((p, i) => (
            <ChoiceCard
              key={p.id}
              label={t(`${L}.${p.id}.title`)}
              detail={t(`${L}.${p.id}.lead`)}
              icon={<p.icon size={26} />}
              onPress={() => goIndex(i)}
            />
          ))}
        </Stack>
      </Stack>,
      <ActionButton fullWidth icon={<DirectionalIcon><IconArrowRight size={20} /></DirectionalIcon>} onPress={() => goIndex(0)}>
        {t(`${L}.start`)}
      </ActionButton>,
    )
  }

  return shell(
    <Stack gap="lg">
      <LessonProgress value={index + 1} total={cervicalCourse.length} label={t(`${L}.part_of`, { n: index + 1, total: cervicalCourse.length })} />
      <Stack gap="xs">
        <Text variant="title" as="h2">
          {t(`${L}.${part.id}.title`)}
        </Text>
        <Text tone="muted">{t(`${L}.${part.id}.lead`)}</Text>
      </Stack>
      {part.slides.map((slide) => (
        <Slide key={slide.base} slide={slide} />
      ))}
      <PartExtras part={part} />
    </Stack>,
    <Row gap="sm" wrap={false} grow>
      <ActionButton variant="secondary" icon={<DirectionalIcon><IconArrowLeft size={20} /></DirectionalIcon>} onPress={() => goIndex(index - 1)}>
        {t(`${L}.back`)}
      </ActionButton>
      <ActionButton icon={<DirectionalIcon><IconArrowRight size={20} /></DirectionalIcon>} onPress={() => goIndex(index + 1)}>
        {t(`${L}.next`)}
      </ActionButton>
    </Row>,
  )
}

const timelineIcon = {
  letter: <IconMail size={26} />,
  visit: <IconDoorEnter size={26} />,
  result: <IconMailOpened size={26} />,
  next: <IconCalendarRepeat size={26} />,
}

function Slide({ slide }: { slide: CourseSlide }) {
  const t = useT()
  return (
    <SurfaceCard as="article">
      <Stack gap="md">
        <LessonScene icon={slide.icon} accents={slide.accents} tone={slide.tone} badge={slide.badgeKey ? t(slide.badgeKey) : undefined} />
        <Text variant="heading" as="h3">
          {t(`${slide.base}_title`)}
        </Text>
        <Row gap="sm" align="start" justify="between" wrap={false}>
          <Text>{t(`${slide.base}_body`)}</Text>
          <CardAudioButton textKey={`${slide.base}_body`} />
        </Row>
        {slide.checklist && <Checklist items={slide.checklist.map(([key, Icon]) => ({ icon: <Icon size={22} />, text: t(key) }))} />}
      </Stack>
    </SurfaceCard>
  )
}

function PartExtras({ part }: { part: CoursePart }) {
  const t = useT()
  return (
    <>
      {part.rights && (
        <SurfaceCard>
          <Checklist items={part.rights.map(([key, Icon]) => ({ icon: <Icon size={22} />, text: t(key) }))} />
        </SurfaceCard>
      )}
      {part.phrases && (
        <Stack gap="sm">
          <Text variant="heading" as="h3">
            {t(`${L}.phrase.title`)}
          </Text>
          <Text tone="muted">{t(`${L}.phrase.lead`)}</Text>
          {part.phrases.map((phrase) => (
            <PhraseCard
              key={phrase.finnishKey}
              phrase={t(phrase.finnishKey)}
              meaning={t(phrase.meaningKey)}
              action={<CardAudioButton textKey={phrase.finnishKey} lang="fi" />}
            />
          ))}
        </Stack>
      )}
      {part.faq && (
        <Stack gap="sm">
          {part.faq.map((item) => (
            <FaqItem key={item.q} question={t(item.q)} icon={<item.icon size={20} aria-hidden="true" />}>
              <Row gap="sm" align="start" justify="between" wrap={false}>
                <Text>{t(item.a)}</Text>
                <CardAudioButton textKey={item.a} />
              </Row>
            </FaqItem>
          ))}
        </Stack>
      )}
    </>
  )
}

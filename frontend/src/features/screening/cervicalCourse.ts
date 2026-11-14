import {
  IconBabyCarriage,
  IconBed,
  IconBrush,
  IconCalendarEvent,
  IconCalendarRepeat,
  IconCircleCheck,
  IconClipboardList,
  IconClock,
  IconCoin,
  IconDoorEnter,
  IconDroplet,
  IconEyeSearch,
  IconFileText,
  IconGenderFemale,
  IconHandStop,
  IconHeartHandshake,
  IconHeartbeat,
  IconHome,
  IconId,
  IconLanguage,
  IconLock,
  IconMail,
  IconMailOpened,
  IconMicroscope,
  IconMoodSmile,
  IconPill,
  IconQuestionMark,
  IconShieldCheck,
  IconUser,
  IconUsers,
  IconVirus,
  IconWind,
  type Icon,
} from '@tabler/icons-react'
import type { SceneTone } from '@/shared/ui'

/**
 * The cervical screening guide: five parts, each a screen of illustrated cards.
 * Keys only; every text lives in the published content (`ui.screening.learn.*`,
 * seed `backend/care_paths/seed/ui/screening.yaml`). Facts follow HUS / City of Helsinki
 * screening pages (checked 14 Nov 2026), see the feature README.
 */

export interface CourseSlide {
  /** Text keys: `<base>_title`, `<base>_body`. */
  base: string
  icon: Icon
  accents?: Icon[]
  tone?: SceneTone
  /** Key of a short badge on the picture (for example "10 min"). */
  badgeKey?: string
  /** Optional visual checklist under the body: [text key, icon]. */
  checklist?: [string, Icon][]
}

export interface CoursePhrase {
  /** The Finnish sentence (same text in every language) and its meaning in the resident's language. */
  finnishKey: string
  meaningKey: string
}

export interface CourseFaq {
  q: string
  a: string
  icon: Icon
}

export interface CoursePart {
  id: 'why' | 'visit' | 'rights' | 'after' | 'faq'
  icon: Icon
  slides: CourseSlide[]
  /** Rights part: a visual list of rights and Finnish desk phrases. */
  rights?: [string, Icon][]
  phrases?: CoursePhrase[]
  faq?: CourseFaq[]
}

const k = (part: string, name: string) => `ui.screening.learn.${part}.${name}`

export const cervicalCourse: CoursePart[] = [
  {
    id: 'why',
    icon: IconShieldCheck,
    slides: [
      { base: k('why', 'early'), icon: IconMicroscope, accents: [IconClock, IconCircleCheck], tone: 'primary' },
      { base: k('why', 'no_symptoms'), icon: IconMoodSmile, accents: [IconHeartbeat], tone: 'success' },
      { base: k('why', 'hpv'), icon: IconVirus, accents: [IconUsers, IconHeartHandshake], tone: 'neutral' },
      { base: k('why', 'works'), icon: IconShieldCheck, accents: [IconCalendarRepeat], tone: 'success', badgeKey: k('why', 'works_badge') },
    ],
  },
  {
    id: 'visit',
    icon: IconDoorEnter,
    slides: [
      {
        base: k('visit', 'before'),
        icon: IconClipboardList,
        accents: [IconId, IconCalendarEvent],
        checklist: [
          [k('visit', 'prep_form'), IconFileText],
          [k('visit', 'prep_id'), IconId],
          [k('visit', 'prep_period'), IconDroplet],
          [k('visit', 'prep_gel'), IconPill],
        ],
      },
      { base: k('visit', 'arrive'), icon: IconDoorEnter, accents: [IconUser, IconLock], badgeKey: k('visit', 'arrive_badge') },
      { base: k('visit', 'sample'), icon: IconBrush, accents: [IconBed, IconGenderFemale] },
      { base: k('visit', 'feel'), icon: IconWind, accents: [IconMoodSmile, IconHandStop], tone: 'success' },
    ],
  },
  {
    id: 'rights',
    icon: IconHeartHandshake,
    slides: [{ base: k('rights', 'intro'), icon: IconHeartHandshake, accents: [IconGenderFemale, IconLanguage, IconHandStop] }],
    rights: [
      [k('rights', 'female'), IconGenderFemale],
      [k('rights', 'interpreter'), IconLanguage],
      [k('rights', 'companion'), IconUsers],
      [k('rights', 'stop'), IconHandStop],
      [k('rights', 'choice'), IconCalendarEvent],
      [k('rights', 'private'), IconLock],
    ],
    phrases: [
      { finnishKey: 'ui.screening.learn.phrase.female_fi', meaningKey: 'ui.screening.learn.phrase.female_meaning' },
      { finnishKey: 'ui.screening.learn.phrase.interpreter_fi', meaningKey: 'ui.screening.learn.phrase.interpreter_meaning' },
      { finnishKey: 'ui.screening.learn.phrase.slow_fi', meaningKey: 'ui.screening.learn.phrase.slow_meaning' },
    ],
  },
  {
    id: 'after',
    icon: IconMailOpened,
    slides: [
      { base: k('after', 'home'), icon: IconHome, accents: [IconDroplet], tone: 'success' },
      { base: k('after', 'results'), icon: IconMail, accents: [IconClock], badgeKey: k('after', 'results_badge') },
      { base: k('after', 'normal'), icon: IconCircleCheck, accents: [IconCalendarRepeat], tone: 'success' },
      { base: k('after', 'more'), icon: IconEyeSearch, accents: [IconMail, IconShieldCheck], tone: 'warning' },
    ],
  },
  {
    id: 'faq',
    icon: IconQuestionMark,
    slides: [],
    faq: [
      { q: k('faq', 'hurt_q'), a: k('faq', 'hurt_a'), icon: IconWind },
      { q: k('faq', 'hpv_q'), a: k('faq', 'hpv_a'), icon: IconVirus },
      { q: k('faq', 'period_q'), a: k('faq', 'period_a'), icon: IconDroplet },
      { q: k('faq', 'pregnant_q'), a: k('faq', 'pregnant_a'), icon: IconBabyCarriage },
      { q: k('faq', 'never_q'), a: k('faq', 'never_a'), icon: IconHeartHandshake },
      { q: k('faq', 'cutting_q'), a: k('faq', 'cutting_a'), icon: IconGenderFemale },
      { q: k('faq', 'removed_q'), a: k('faq', 'removed_a'), icon: IconBrush },
      { q: k('faq', 'time_q'), a: k('faq', 'time_a'), icon: IconCalendarEvent },
      { q: k('faq', 'letter_q'), a: k('faq', 'letter_a'), icon: IconMail },
      { q: k('faq', 'cost_q'), a: k('faq', 'cost_a'), icon: IconCoin },
    ],
  },
]

export const partIds = cervicalCourse.map((part) => part.id)

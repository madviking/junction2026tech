import {
  IconCalendarEvent,
  IconClock,
  IconExternalLink,
  IconFileText,
  IconKey,
  IconLogin,
  IconMapPin,
  IconPhone,
  IconWorld,
  IconX,
} from '@tabler/icons-react'
import { useNavigate } from 'react-router'
import { useT } from '@/shared/i18n'
import { ActionButton, Checklist, Stack, SurfaceCard, Text } from '@/shared/ui'

const A = 'ui.screening.learn.appt'

/**
 * HUS laboratory booking (checked 14 Nov 2026 on hus.fi "Laboratory booking and customer
 * service"): online with bank ID or the letter's reservation key; phone weekdays 7.30–15.30.
 */
export const HUS_BOOKING_URL = 'https://secure.vihta.com/public-ng/hus/#/home'
export const HUS_LAB_PHONE = { href: 'tel:+358947186800', display: '09 471 86800' }

const FIND_ITEMS = [
  ['find_time', IconClock],
  ['find_place', IconMapPin],
  ['find_key', IconKey],
  ['find_form', IconFileText],
] as const

const CHANGE_ITEMS = [
  ['change_1', IconWorld],
  ['change_2', IconLogin],
  ['change_3', IconCalendarEvent],
  ['change_cancel', IconX],
] as const

/** Opening screen of the guide: where the appointment details are, and how to change the time. */
export function AppointmentHelp({ lang }: { lang: string }) {
  const t = useT()
  const navigate = useNavigate()

  return (
    <Stack gap="sm">
      <Text variant="heading" as="h2">
        {t(`${A}.title`)}
      </Text>
      <SurfaceCard as="section">
        <Stack gap="md">
          <Text variant="label" as="h3">
            {t(`${A}.find_title`)}
          </Text>
          <Text>{t(`${A}.find_body`)}</Text>
          <Checklist items={FIND_ITEMS.map(([key, Icon]) => ({ icon: <Icon size={22} />, text: t(`${A}.${key}`) }))} />
          <ActionButton variant="secondary" fullWidth icon={<IconFileText size={20} />} onPress={() => navigate(`/letter/cervical/${lang}`)}>
            {t(`${A}.find_button`)}
          </ActionButton>
        </Stack>
      </SurfaceCard>
      <SurfaceCard as="section">
        <Stack gap="md">
          <Text variant="label" as="h3">
            {t(`${A}.change_title`)}
          </Text>
          <Checklist items={CHANGE_ITEMS.map(([key, Icon]) => ({ icon: <Icon size={22} />, text: t(`${A}.${key}`) }))} />
          <ActionButton fullWidth href={HUS_BOOKING_URL} external icon={<IconExternalLink size={20} />}>
            {t(`${A}.change_online`)}
          </ActionButton>
          <Text tone="muted">{t(`${A}.change_phone`)}</Text>
          <ActionButton variant="secondary" fullWidth href={HUS_LAB_PHONE.href} icon={<IconPhone size={20} />}>
            {/* One string (the button lays out children as flex items); the number is a
                left-to-right isolate so its digit groups never reverse in Arabic or Persian. */}
            {`${t(`${A}.change_call`)} ⁦${HUS_LAB_PHONE.display}⁩`}
          </ActionButton>
        </Stack>
      </SurfaceCard>
    </Stack>
  )
}

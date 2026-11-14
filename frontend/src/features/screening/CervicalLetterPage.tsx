import { IconExternalLink, IconPrinter } from '@tabler/icons-react'
import { useNavigate, useParams } from 'react-router'
import { useContent } from '@/shared/i18n'
import {
  ActionButton,
  LetterBullets,
  LetterFacts,
  LetterQrBlock,
  LetterSection,
  LetterSheet,
  PageShell,
  PrintHidden,
  Row,
  SelectField,
  Stack,
  Text,
} from '@/shared/ui'

const L = 'ui.screening.letter'

/** Where the QR codes point (also baked into /public/qr/letter-cervical-<lang>.svg). */
export const LETTER_APP_HOST = 'fond-useful-corgi.eur-1.aiven.app'

// Fictional demo recipient and booking (persona "Hodan"). Not translated: names, addresses
// and codes stay as printed.
const RECIPIENT = ['Hodan Warsame', 'Esimerkkikatu 12 A 7', '00510 Helsinki']
const RESERVATION = { key: 'K7QF-42DM', pin: '4821' }

/**
 * `/letter/cervical/:lang` — an example cervical screening invitation as a Helsinki resident
 * gets it (content modelled on the HUS / City of Helsinki invitation: pre-booked time, health
 * form, reservation key and PIN), in any published language, with the Silta QR strip.
 * Demo material: stamped "example"; the person, address and codes are fictional.
 */
export function CervicalLetterPage() {
  const { lang = 'en' } = useParams()
  const { t, dir, bundle } = useContent()
  const navigate = useNavigate()
  const options = bundle.languages.map((language) => ({ value: language.code, label: language.name }))

  return (
    <PageShell title={t(`${L}.page_title`)} back={{ label: t('ui.screening.learn.back'), onPress: () => navigate(`/r/${lang}`) }}>
      <Stack gap="lg">
        <PrintHidden>
          <Stack gap="md">
            <Text>{t(`${L}.page_intro`)}</Text>
            <SelectField
              label={t(`${L}.language`)}
              options={options}
              value={lang}
              onChange={(next) => next && navigate(`/letter/cervical/${next}`)}
            />
            <Row gap="sm">
              <ActionButton icon={<IconExternalLink size={20} />} onPress={() => navigate(`/r/${lang}/learn/cervical?via=letter-cervical-hel`)}>
                {t(`${L}.open_guide`)}
              </ActionButton>
              <ActionButton variant="secondary" icon={<IconPrinter size={20} />} onPress={() => window.print()}>
                {t(`${L}.print`)}
              </ActionButton>
            </Row>
          </Stack>
        </PrintHidden>

        <LetterSheet
          lang={lang}
          dir={dir}
          stamp={t(`${L}.stamp`)}
          sender={
            <>
              <Text variant="heading" as="p">
                {t(`${L}.sender`)}
              </Text>
              <Text variant="caption" tone="muted" as="p">
                {t(`${L}.sender_note`)}
              </Text>
            </>
          }
          meta={
            <Text variant="caption" tone="muted" as="p">
              {t(`${L}.date`)}
            </Text>
          }
          recipient={RECIPIENT.map((line) => (
            <Text key={line} as="span">
              {line}
            </Text>
          ))}
        >
          <Text variant="title" as="h2">
            {t(`${L}.title`)}
          </Text>
          <Text>{t(`${L}.greeting`, { name: 'Hodan Warsame' })}</Text>
          <Text>{t(`${L}.intro`)}</Text>
          <LetterFacts
            title={t(`${L}.appt_title`)}
            rows={[
              { label: t(`${L}.appt_time_label`), value: t(`${L}.appt_time`) },
              { label: t(`${L}.appt_place_label`), value: t(`${L}.appt_place`) },
              { label: t(`${L}.appt_duration_label`), value: t(`${L}.appt_duration`) },
              { label: t(`${L}.key_label`), value: <span dir="ltr">{RESERVATION.key}</span> },
              { label: t(`${L}.pin_label`), value: <span dir="ltr">{RESERVATION.pin}</span> },
            ]}
          />
          <LetterSection title={t(`${L}.what_title`)}>
            <Text>{t(`${L}.what_body`)}</Text>
          </LetterSection>
          <LetterSection title={t(`${L}.prepare_title`)}>
            <LetterBullets items={[1, 2, 3, 4].map((n) => t(`${L}.prepare_${n}`))} />
          </LetterSection>
          <LetterSection title={t(`${L}.change_title`)}>
            <Text>{t(`${L}.change_body`)}</Text>
          </LetterSection>
          <LetterSection title={t(`${L}.results_title`)}>
            <Text>{t(`${L}.results_body`)}</Text>
          </LetterSection>
          <Stack gap="xs">
            <Text>{t(`${L}.signoff`)}</Text>
            <Text variant="label">{t(`${L}.signature`)}</Text>
            <Text variant="caption" tone="muted">
              {t(`${L}.enclosure`)}
            </Text>
          </Stack>
          <LetterQrBlock
            qrSrc={`/qr/letter-cervical-${lang}.svg`}
            qrAlt={t(`${L}.qr_alt`)}
            title={t(`${L}.qr_title`)}
            body={t(`${L}.qr_body`)}
            link={`${LETTER_APP_HOST}/r/${lang}/learn/cervical`}
          />
        </LetterSheet>
      </Stack>
    </PageShell>
  )
}

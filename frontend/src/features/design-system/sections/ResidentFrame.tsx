import { IconLanguage } from '@tabler/icons-react'
import { useState } from 'react'
import {
  ActionButton,
  AudioPlayButton,
  ChoiceCard,
  EmergencyCallLink,
  PageShell,
  PlaceholderNotice,
  Stack,
} from '@/shared/ui'
import { ShowcaseFrame } from '@/shared/ui/showcase'
import { noop } from '@/features/design-system/sections/noop'

const BACK = { label: 'Back', onPress: noop }
const BACK_AR = { label: 'رجوع', onPress: noop }

const languages = [
  { code: 'ar', label: 'العربية', detail: 'Arabic' },
  { code: 'so', label: 'Soomaali', detail: 'Somali' },
  { code: 'fi', label: 'Suomi', detail: 'Finnish' },
]

export function ResidentFrame({ rtl }: { rtl?: boolean }) {
  const [selected, setSelected] = useState('ar')
  return (
    <ShowcaseFrame label={rtl ? 'PageShell preview, Arabic' : 'PageShell preview'}>
      <PageShell
        title={rtl ? 'اختر لغتك' : 'Choose your language'}
        back={rtl ? BACK_AR : BACK}
        headerAction={<AudioPlayButton state="idle" label={rtl ? 'استمع' : 'Listen'} onPress={noop} />}
        emergency={<EmergencyCallLink label={rtl ? 'حالة طارئة؟ اتصل' : 'Emergency? Call'} phoneNumber="112" />}
        bottomActions={<ActionButton fullWidth>{rtl ? 'متابعة' : 'Continue'}</ActionButton>}
      >
        <Stack gap="sm">
          {languages.map((language) => (
            <ChoiceCard
              key={language.code}
              label={language.label}
              lang={language.code}
              detail={language.detail}
              icon={<IconLanguage size={28} />}
              selected={selected === language.code}
              onPress={() => setSelected(language.code)}
              trailing={<AudioPlayButton state="idle" label={`Listen: ${language.detail}`} onPress={noop} />}
            />
          ))}
          <PlaceholderNotice>{rtl ? 'ترجمة غير مدققة' : 'Unchecked translation'}</PlaceholderNotice>
        </Stack>
      </PageShell>
    </ShowcaseFrame>
  )
}

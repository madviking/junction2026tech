import { IconPlayerStopFilled, IconVolume } from '@tabler/icons-react'
import { useEffect, useId } from 'react'
import { blobUrl } from '@/features/voice/api/blobUrl'
import { useClipFetcher } from '@/features/voice/api/useClip'
import { useVoiceCapabilities } from '@/features/voice/api/useVoiceCapabilities'
import { playSequence, stop, usePlayerState } from '@/features/voice/state/player'
import { useContent } from '@/shared/i18n'
import { ActionButton } from '@/shared/ui'

export interface PageAudioButtonProps {
  /** Text keys read aloud in this order, in the current language. */
  textKeys: readonly string[]
}

/**
 * One "Listen" button that reads a whole screen: the texts play one after another through
 * the shared player. Use it where a play button on every line would crowd the screen.
 * Renders nothing when the language has no audio output.
 */
export function PageAudioButton({ textKeys }: PageAudioButtonProps) {
  const { lang, t } = useContent()
  const caps = useVoiceCapabilities(lang)
  const fetchClip = useClipFetcher(lang)
  const owner = useId()
  const state = usePlayerState(owner)

  // Leaving the screen stops the reading.
  useEffect(() => () => stop(owner), [owner])

  if (!caps?.audioOutput) return null

  const active = state === 'playing' || state === 'loading'
  const label = state === 'playing' ? t('ui.voice.stop') : state === 'error' ? t('ui.voice.error') : t('ui.voice.play')
  const onPress = () => {
    if (active) {
      stop(owner)
      return
    }
    void playSequence(
      owner,
      textKeys.map((key) => async () => blobUrl((await fetchClip(key)).url)),
    )
  }

  return (
    <ActionButton
      variant="secondary"
      loading={state === 'loading'}
      icon={state === 'playing' ? <IconPlayerStopFilled size={20} aria-hidden="true" /> : <IconVolume size={22} aria-hidden="true" />}
      onPress={onPress}
    >
      {label}
    </ActionButton>
  )
}

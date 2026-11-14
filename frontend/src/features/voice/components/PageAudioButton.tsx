import { IconPlayerStopFilled, IconVolume } from '@tabler/icons-react'
import { useEffect, useId } from 'react'
import { blobUrl } from '@/features/voice/api/blobUrl'
import { useClipFetcher } from '@/features/voice/api/useClip'
import { useVoiceCapabilities } from '@/features/voice/api/useVoiceCapabilities'
import { playSequence, stop, usePlayerState, useReadingIndex } from '@/features/voice/state/player'
import { useContent } from '@/shared/i18n'
import { ActionButton } from '@/shared/ui'

export interface PageAudioButtonProps {
  /** Text keys read aloud in this order, in the current language. */
  textKeys: readonly string[]
  /**
   * Called with the text key being read (loading or playing), and with null when reading
   * stops, ends or fails, so the screen can mark the box being read.
   */
  onReading?: (textKey: string | null) => void
}

/**
 * One "Listen" button that reads a whole screen: the texts play one after another through
 * the shared player, and `onReading` says which one is being read so the screen can mark it. Use it where a play button on every line would crowd the screen.
 * Renders nothing when the language has no audio output.
 */
export function PageAudioButton({ textKeys, onReading }: PageAudioButtonProps) {
  const { lang, t } = useContent()
  const caps = useVoiceCapabilities(lang)
  const fetchClip = useClipFetcher(lang)
  const owner = useId()
  const state = usePlayerState(owner)
  const readingIndex = useReadingIndex(owner)
  const readingKey = readingIndex === null ? null : (textKeys[readingIndex] ?? null)

  // Leaving the screen stops the reading.
  useEffect(() => () => stop(owner), [owner])
  useEffect(() => onReading?.(readingKey), [onReading, readingKey])

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

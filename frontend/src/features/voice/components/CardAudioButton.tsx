import { useEffect, useId } from 'react'
import { blobUrl } from '@/features/voice/api/blobUrl'
import { useClip } from '@/features/voice/api/useClip'
import { useVoiceCapabilities } from '@/features/voice/api/useVoiceCapabilities'
import { play, stop, usePlayerState } from '@/features/voice/state/player'
import { useContent } from '@/shared/i18n'
import { AudioPlayButton } from '@/shared/ui'

export interface CardAudioButtonProps {
  /** Content text key whose published text (in the current language) is played. */
  textKey: string
  /** Accessible label; defaults to a localised "Listen" label. */
  label?: string
  /** Language of the audio; defaults to the current content language (e.g. 'fi' for the Finnish call script). */
  lang?: string
}

/**
 * Plays the published audio for a text key through the one shared player. Renders nothing
 * when the language has no audio output. Somali generated audio is marked as unchecked in
 * the accessible name.
 */
export function CardAudioButton({ textKey, label, lang }: CardAudioButtonProps) {
  const { lang: contentLang, t } = useContent()
  const audioLang = lang ?? contentLang
  const caps = useVoiceCapabilities(audioLang)
  const { clip, fetchClip } = useClip(audioLang, textKey)
  const owner = useId()
  const state = usePlayerState(owner)

  // Leaving the screen stops this button's audio.
  useEffect(() => () => stop(owner), [owner])

  if (!caps?.audioOutput) return null

  const review = clip?.review ?? caps.generatedAudioReview
  const base =
    state === 'playing' ? t('ui.voice.stop') : state === 'loading' ? t('ui.voice.loading') : state === 'error' ? t('ui.voice.error') : (label ?? t('ui.voice.play'))
  const accessibleLabel = review === 'unchecked' ? `${base} (${t('ui.voice.unchecked')})` : base

  const onPress = () => {
    if (state === 'playing' || state === 'loading') {
      stop(owner)
      return
    }
    void play(owner, async () => blobUrl((await fetchClip()).url))
  }

  return <AudioPlayButton state={state} label={accessibleLabel} onPress={onPress} />
}

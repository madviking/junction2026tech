import { CardAudioButton } from '@/features/voice'
import { Row, Text } from '@/shared/ui'

/** A question or instruction with its play button. */
export function StageQuestion({ text, textKey, eyebrow }: { text: string; textKey: string; eyebrow?: string }) {
  return (
    <Row gap="sm" align="center" justify="between" wrap={false}>
      <div>
        {eyebrow && (
          <Text variant="caption" eyebrow>
            {eyebrow}
          </Text>
        )}
        <Text variant="title" as="h2">
          {text}
        </Text>
      </div>
      <CardAudioButton textKey={textKey} />
    </Row>
  )
}

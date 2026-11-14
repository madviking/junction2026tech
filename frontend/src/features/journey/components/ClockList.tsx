import { clockLabelKey } from '@/features/journey/keys'
import type { VisitView } from '@/features/journey/types'
import { CardAudioButton } from '@/features/voice'
import { useContent } from '@/shared/i18n'
import { Row, Stack, StatusBadge, SurfaceCard, Text, type Tone } from '@/shared/ui'

const BASIS_TONE: Record<string, Tone> = { legal: 'info', recommended: 'neutral', open: 'warning' }

/** The time limits of a care path, each with its basis (law, recommendation). */
export function ClockList({ path }: { path: NonNullable<VisitView['carePath']> }) {
  const { t, has } = useContent()
  return (
    <Stack gap="xs">
      {path.clocks.map((clock, i) => {
        const labelKey = clockLabelKey(path.lane, path.route, i, clock.label, has, t)
        return (
          <div key={`${clock.label}-${clock.limit}`}>
            <SurfaceCard padding="sm">
              <Row gap="sm" align="center" justify="between" wrap={false}>
                <Stack gap="xs">
                  <Text variant="label">{clock.label}</Text>
                  <Text tone="muted">{clock.limit}</Text>
                  <Row gap="sm">
                    <StatusBadge tone={BASIS_TONE[clock.basis] ?? 'neutral'}>{t(`ui.journey.basis.${clock.basis}`)}</StatusBadge>
                  </Row>
                </Stack>
                {labelKey && <CardAudioButton textKey={labelKey} />}
              </Row>
            </SurfaceCard>
          </div>
        )
      })}
    </Stack>
  )
}

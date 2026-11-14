import { MatchInput } from '@/features/journey/components/MatchInput'
import { routeCardKey, routeQuestionKey } from '@/features/journey/keys'
import type { MatchFn } from '@/features/journey/types'
import { CardAudioButton } from '@/features/voice'
import { useContent } from '@/shared/i18n'
import { ChoiceCard, Row, Stack, SurfaceCard, Text } from '@/shared/ui'

export interface RouteChoicesProps {
  match: MatchFn
  disabled: boolean
  onRoute: (route: string) => void
}

/** The route questions (guidance only) and one card per route from the live content. */
export function RouteChoices({ match, disabled, onRoute }: RouteChoicesProps) {
  const { t, bundle } = useContent()
  const questions = Array.from({ length: bundle.journey.routeFact.questions }, (_, i) => routeQuestionKey(i))

  return (
    <Stack gap="md">
      {questions.length > 0 && (
        <SurfaceCard tone="muted">
          <Stack gap="xs">
            <Text variant="label">{t('ui.journey.route.guidance')}</Text>
            <Stack gap="xs">
              {questions.map((key) => (
                <div key={key}>
                  <Row gap="sm" align="center" justify="between" wrap={false}>
                    <Text>{t(key)}</Text>
                    <CardAudioButton textKey={key} />
                  </Row>
                </div>
              ))}
            </Stack>
          </Stack>
        </SurfaceCard>
      )}
      <MatchInput set="route" match={match} onChosen={onRoute} disabled={disabled} />
      <Stack gap="sm">
        {bundle.routes.map((code) => (
          <ChoiceCard
            key={code}
            label={t(routeCardKey(code))}
            disabled={disabled}
            onPress={() => onRoute(code)}
            trailing={<CardAudioButton textKey={routeCardKey(code)} />}
          />
        ))}
      </Stack>
    </Stack>
  )
}

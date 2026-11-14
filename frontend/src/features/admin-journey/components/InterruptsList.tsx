import { ActionButton, Row, Section, Stack, SurfaceCard, Text } from '@/shared/ui'
import type { GraphInterrupt } from '@/features/admin-journey/types'

/** Interrupts are reachable from every stage (always on screen); listed apart from the graph. */
export function InterruptsList({ interrupts, onFollow }: { interrupts: GraphInterrupt[]; onFollow: (stageId: string) => void }) {
  return (
    <SurfaceCard>
      <Section level={2} title="Interrupts" description="Always on screen, from every stage.">
        <Stack as="ul" gap="xs">
          {interrupts.map((interrupt) => (
            <li key={interrupt.id}>
              <Row gap="xs">
                <Text as="span">{interrupt.card || interrupt.id}</Text>
                <Text as="span" tone="muted" variant="caption">
                  {`${interrupt.id} →`}
                </Text>
                <ActionButton variant="subtle" compact ariaLabel={`Go to stage ${interrupt.next}`} onPress={() => onFollow(interrupt.next)}>
                  {interrupt.next}
                </ActionButton>
              </Row>
            </li>
          ))}
        </Stack>
      </Section>
    </SurfaceCard>
  )
}

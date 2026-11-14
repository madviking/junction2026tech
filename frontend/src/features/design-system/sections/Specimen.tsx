import type { ReactNode } from 'react'
import { Stack, SurfaceCard, Text } from '@/shared/ui'

/** A titled specimen block inside the gallery. */
export function Specimen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SurfaceCard as="section">
      <Stack gap="md">
        <Text variant="heading" as="h3">
          {title}
        </Text>
        {children}
      </Stack>
    </SurfaceCard>
  )
}

export function StateLabel({ children }: { children: ReactNode }) {
  return (
    <Text variant="caption" tone="muted">
      {children}
    </Text>
  )
}

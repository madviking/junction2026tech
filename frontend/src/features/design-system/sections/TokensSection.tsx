import { Grid, Section } from '@/shared/ui'
import {
  ContrastPairList,
  PaletteSwatches,
  RadiusScale,
  SemanticSwatches,
  ShadowScale,
  SpacingScale,
  TypeScaleSample,
} from '@/shared/ui/showcase'
import { Specimen } from '@/features/design-system/sections/Specimen'

export function TokensSection() {
  return (
    <Section eyebrow="Foundations" title="Tokens" description="Defined once in src/shared/ui/tokens.ts.">
      <Specimen title="Semantic colours">
        <SemanticSwatches />
      </Specimen>
      <Specimen title="Palettes">
        <PaletteSwatches />
      </Specimen>
      <Specimen title="Contrast (WCAG 2.2 AA)">
        <ContrastPairList />
      </Specimen>
      <Specimen title="Type scale">
        <TypeScaleSample sample="Find the right door, in your language" />
      </Specimen>
      <Grid min="md">
        <Specimen title="Spacing">
          <SpacingScale />
        </Specimen>
        <Specimen title="Radius">
          <RadiusScale />
        </Specimen>
        <Specimen title="Shadows">
          <ShadowScale />
        </Specimen>
      </Grid>
    </Section>
  )
}

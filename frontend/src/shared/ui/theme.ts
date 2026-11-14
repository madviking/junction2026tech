import { createTheme, type CSSVariablesResolver, type MantineColorsTuple } from '@mantine/core'
import {
  breakpoints,
  FILLED_SHADE,
  fontFamily,
  fontFamilyMonospace,
  palettes,
  radius,
  semanticColors,
  shadows,
  spacing,
  tones,
  typeScale,
} from '@/shared/ui/tokens'

const tuple = (shades: readonly string[]) => shades as unknown as MantineColorsTuple

/** The Mantine theme, built only from `tokens.ts`. */
export const theme = createTheme({
  colors: {
    primary: tuple(palettes.primary),
    emergency: tuple(palettes.emergency),
    warning: tuple(palettes.warning),
    success: tuple(palettes.success),
    neutral: tuple(palettes.neutral),
    // Mantine's own components read `gray` for borders and dimmed text.
    gray: tuple(palettes.neutral),
  },
  primaryColor: 'primary',
  primaryShade: FILLED_SHADE,
  white: semanticColors.surface,
  black: semanticColors.text,
  autoContrast: true,
  focusRing: 'auto',
  respectReducedMotion: true,
  cursorType: 'pointer',
  fontFamily,
  fontFamilyMonospace,
  headings: {
    fontFamily,
    fontWeight: String(typeScale.title.fontWeight),
    sizes: {
      h1: { fontSize: typeScale.display.fontSize, lineHeight: typeScale.display.lineHeight },
      h2: { fontSize: typeScale.title.fontSize, lineHeight: typeScale.title.lineHeight },
      h3: { fontSize: typeScale.heading.fontSize, lineHeight: typeScale.heading.lineHeight },
      h4: { fontSize: typeScale.label.fontSize, lineHeight: typeScale.label.lineHeight },
      h5: { fontSize: typeScale.label.fontSize, lineHeight: typeScale.label.lineHeight },
      h6: { fontSize: typeScale.caption.fontSize, lineHeight: typeScale.caption.lineHeight },
    },
  },
  fontSizes: {
    xs: typeScale.caption.fontSize,
    sm: typeScale.caption.fontSize,
    md: typeScale.body.fontSize,
    lg: typeScale.heading.fontSize,
    xl: typeScale.title.fontSize,
  },
  lineHeights: {
    xs: typeScale.caption.lineHeight,
    sm: typeScale.caption.lineHeight,
    md: typeScale.body.lineHeight,
    lg: typeScale.heading.lineHeight,
    xl: typeScale.title.lineHeight,
  },
  spacing: { xs: spacing.xs, sm: spacing.sm, md: spacing.md, lg: spacing.lg, xl: spacing.xl },
  radius: { xs: radius.xs, sm: radius.sm, md: radius.md, lg: radius.lg, xl: radius.xl },
  defaultRadius: 'md',
  shadows,
  breakpoints,
})

/**
 * Exposes tokens as `--silta-*` CSS variables for the primitives' CSS modules and
 * points Mantine's own text/border variables at the semantic roles.
 */
export const cssVariablesResolver: CSSVariablesResolver = () => {
  const variables: Record<`--${string}`, string> = {}
  for (const [name, value] of Object.entries(semanticColors)) {
    variables[`--silta-color-${kebab(name)}`] = value
  }
  for (const [tone, values] of Object.entries(tones)) {
    for (const [part, value] of Object.entries(values)) {
      variables[`--silta-tone-${tone}-${part}`] = value
    }
  }
  for (const [name, value] of Object.entries(spacing)) variables[`--silta-space-${name}`] = value
  for (const [name, value] of Object.entries(radius)) variables[`--silta-radius-${name}`] = value
  for (const [name, style] of Object.entries(typeScale)) {
    variables[`--silta-type-${name}-size`] = style.fontSize
    variables[`--silta-type-${name}-line-height`] = style.lineHeight
    variables[`--silta-type-${name}-weight`] = String(style.fontWeight)
  }

  return {
    variables,
    light: {
      '--mantine-color-body': semanticColors.background,
      '--mantine-color-text': semanticColors.text,
      '--mantine-color-dimmed': semanticColors.textMuted,
      '--mantine-color-default-border': semanticColors.borderSubtle,
      '--mantine-color-anchor': semanticColors.link,
      '--mantine-color-error': semanticColors.emergency,
      '--mantine-color-placeholder': semanticColors.textMuted,
    },
    dark: {},
  }
}

function kebab(name: string) {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

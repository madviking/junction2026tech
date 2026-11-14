import type { CSSProperties, ReactNode } from 'react'
import { AA, contrastRatio } from '@/shared/ui/contrast'
import { contrastPairs } from '@/shared/ui/contrastPairs'
import { Stack } from '@/shared/ui/layout/Layout'
import { palettes, radius, semanticColors, shadows, spacing, typeScale, white, type TextVariant } from '@/shared/ui/tokens'
import { Text } from '@/shared/ui/typography/Text'
import classes from './showcase.module.css'

// Token values are static, so each inline style object is built once and reused.
const styleCache = new Map<string, CSSProperties>()
function cachedStyle(key: string, build: () => CSSProperties) {
  let style = styleCache.get(key)
  if (!style) {
    style = build()
    styleCache.set(key, style)
  }
  return style
}

const ratio = (a: string, b: string) => contrastRatio(a, b).toFixed(2)

function readableOn(background: string) {
  return contrastRatio(semanticColors.text, background) >= contrastRatio(white, background) ? semanticColors.text : white
}

function Swatch({ name, value, meta }: { name: string; value: string; meta: string }) {
  const color = readableOn(value)
  return (
    <div className={classes.swatch} style={cachedStyle(`swatch:${value}`, () => ({ background: value, color }))}>
      <span className={classes.swatchName}>{name}</span>
      <span className={classes.swatchMeta}>{value}</span>
      <span className={classes.swatchMeta}>{meta}</span>
    </div>
  )
}

/** Every palette shade with its hex and contrast against white. */
export function PaletteSwatches() {
  return (
    <Stack gap="lg">
      {Object.entries(palettes).map(([name, shades]) => (
        <Stack key={name} gap="xs">
          <Text variant="label">{name}</Text>
          <div className={classes.paletteRow}>
            {shades.map((shade, index) => (
              <Swatch key={shade} name={`${name}.${index}`} value={shade} meta={`${ratio(shade, white)}:1 on white`} />
            ))}
          </div>
        </Stack>
      ))}
    </Stack>
  )
}

/** Semantic roles (what components use) with contrast against surface. */
export function SemanticSwatches() {
  return (
    <div className={classes.paletteRow}>
      {Object.entries(semanticColors).map(([name, value]) => (
        <Swatch key={name} name={name} value={value} meta={`${ratio(value, semanticColors.surface)}:1 on surface`} />
      ))}
    </div>
  )
}

/** Every foreground/background pair the primitives render, with ratio and WCAG verdict. */
export function ContrastPairList() {
  return (
    <Stack gap="xs">
      {contrastPairs.map((pair) => {
        const value = contrastRatio(pair.foreground, pair.background)
        const pass = value >= AA[pair.kind]
        return (
          <div key={pair.name} className={classes.pair} style={cachedStyle(`pair:${pair.name}`, () => ({ background: pair.background, color: pair.foreground }))}>
            <span className={classes.pairSample}>{pair.name}</span>
            <span className={classes.pairRatio}>
              {value.toFixed(2)}:1 {pass ? 'AA' : 'FAIL'} (min {AA[pair.kind]})
            </span>
          </div>
        )
      })}
    </Stack>
  )
}

export function SpacingScale() {
  return (
    <Stack gap="xs">
      {Object.entries(spacing).map(([name, value]) => (
        <div key={name} className={classes.scaleRow}>
          <span className={classes.scaleName}>
            {name} {value}
          </span>
          <div className={classes.spaceBar} style={cachedStyle(`space:${value}`, () => ({ inlineSize: value }))} />
        </div>
      ))}
    </Stack>
  )
}

export function RadiusScale() {
  return (
    <Stack gap="xs">
      {Object.entries(radius).map(([name, value]) => (
        <div key={name} className={classes.scaleRow}>
          <span className={classes.scaleName}>
            {name} {value}
          </span>
          <div className={classes.radiusBox} style={cachedStyle(`radius:${value}`, () => ({ borderRadius: value }))} />
        </div>
      ))}
    </Stack>
  )
}

export function ShadowScale() {
  return (
    <Stack gap="md">
      {Object.entries(shadows).map(([name, value]) => (
        <div key={name} className={classes.scaleRow}>
          <span className={classes.scaleName}>{name}</span>
          <div className={classes.shadowBox} style={cachedStyle(`shadow:${value}`, () => ({ boxShadow: value }))} />
        </div>
      ))}
    </Stack>
  )
}

/** The six text styles with their size, line height and weight. */
export function TypeScaleSample({ sample }: { sample: ReactNode }) {
  return (
    <Stack gap="md">
      {(Object.keys(typeScale) as TextVariant[]).map((variant) => {
        const style = typeScale[variant]
        return (
          <Stack key={variant} gap="none">
            <Text variant="caption" tone="muted">
              {variant}: {style.fontSize} / {style.lineHeight} / {style.fontWeight}
              {style.large ? ' (large text)' : ''}
            </Text>
            <Text variant={variant} as="p">
              {sample}
            </Text>
          </Stack>
        )
      })}
    </Stack>
  )
}

/** A phone-sized scrolling frame to preview a full PageShell inside the gallery. */
export function ShowcaseFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={classes.frame} role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  )
}

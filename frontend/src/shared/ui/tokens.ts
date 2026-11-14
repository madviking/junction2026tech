/**
 * Design tokens: the single source of every colour, size and type style in Silta.
 * `theme.ts` turns these into the Mantine theme and `--silta-*` CSS variables;
 * `contrast.test.ts` proves the semantic pairs meet WCAG 2.2 AA.
 * Change a value here, never in a component.
 */

type Shades = readonly [string, string, string, string, string, string, string, string, string, string]

/** Ten-shade palettes (0 lightest, 9 darkest), Mantine's format. */
export const palettes = {
  /** Calm petrol blue: brand, primary actions, links, focus. */
  primary: ['#e8f3f6', '#cfe6ec', '#a0cdd9', '#6db2c4', '#4499b0', '#2a87a1', '#1b7590', '#135f76', '#0d4b5e', '#073746'],
  /** Clear red: emergencies and destructive actions only. */
  emergency: ['#fdeded', '#f9d3d3', '#f2a6a6', '#ea7676', '#e14d4d', '#d63333', '#c42424', '#a81c1c', '#8a1616', '#6b1010'],
  /** Amber: caution, unchecked content. */
  warning: ['#fff6e0', '#ffeab8', '#ffd97f', '#ffc847', '#f5b31f', '#e09d0b', '#c28405', '#8f6100', '#6e4a00', '#523700'],
  /** Green: done, confirmed. */
  success: ['#e8f6ed', '#c9ebd4', '#97d8ad', '#62c384', '#3aae63', '#23994e', '#188440', '#116c34', '#0c5629', '#07401e'],
  /** Cool neutral: text, borders, surfaces. Also replaces Mantine's `gray`. */
  neutral: ['#f7f8f9', '#eef0f2', '#dde1e5', '#c4cad1', '#9aa3ad', '#747e8a', '#5a6470', '#434c57', '#2e353e', '#1b2027'],
} as const satisfies Record<string, Shades>

export type PaletteName = keyof typeof palettes

/** Shade used for filled backgrounds (buttons, solid banners); white text on it is ≥ 7:1. */
export const FILLED_SHADE = 7

export const white = '#ffffff'

/** Semantic colour roles. Components use these (as `--silta-color-*`), not palette shades. */
export const semanticColors = {
  /** Page background behind cards. */
  background: palettes.neutral[0],
  /** Cards, header, inputs. */
  surface: white,
  /** Subtle fill for hovered rows and selected-but-quiet areas. */
  surfaceHover: palettes.neutral[1],
  /** Selected choice background. */
  surfaceSelected: palettes.primary[0],
  text: palettes.neutral[9],
  textMuted: palettes.neutral[6],
  /** Text on filled (primary/emergency) backgrounds. */
  textOnFilled: white,
  /** Boundaries that identify a control (inputs, choice cards): ≥ 3:1. */
  border: palettes.neutral[5],
  /** Decorative separators (card outlines, table rows): no contrast requirement. */
  borderSubtle: palettes.neutral[2],
  primary: palettes.primary[FILLED_SHADE],
  primaryHover: palettes.primary[8],
  link: palettes.primary[FILLED_SHADE],
  focus: palettes.primary[FILLED_SHADE],
  emergency: palettes.emergency[FILLED_SHADE],
  emergencyHover: palettes.emergency[8],
} as const

export type SemanticColor = keyof typeof semanticColors

/** Status tones shared by Banner, StatusBadge, StatTile deltas and Text tones. */
export const tones = {
  neutral: { bg: palettes.neutral[1], fg: palettes.neutral[8], border: palettes.neutral[5], solid: palettes.neutral[7] },
  info: { bg: palettes.primary[0], fg: palettes.primary[8], border: palettes.primary[6], solid: palettes.primary[7] },
  success: { bg: palettes.success[0], fg: palettes.success[8], border: palettes.success[6], solid: palettes.success[7] },
  warning: { bg: palettes.warning[0], fg: palettes.warning[8], border: palettes.warning[6], solid: palettes.warning[7] },
  danger: { bg: palettes.emergency[0], fg: palettes.emergency[8], border: palettes.emergency[6], solid: palettes.emergency[7] },
} as const

export type Tone = keyof typeof tones

/** Spacing scale (rem). Layout `gap`/`padding` props accept only these names. */
export const spacing = {
  none: '0',
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  xxl: '3rem',
} as const

export type SpaceToken = keyof typeof spacing

export const radius = {
  xs: '0.25rem',
  sm: '0.375rem',
  md: '0.625rem',
  lg: '1rem',
  xl: '1.5rem',
  full: '999px',
} as const

export const shadows = {
  xs: '0 1px 2px rgba(27, 32, 39, 0.06)',
  sm: '0 1px 3px rgba(27, 32, 39, 0.1), 0 1px 2px rgba(27, 32, 39, 0.06)',
  md: '0 4px 12px rgba(27, 32, 39, 0.1)',
  lg: '0 8px 24px rgba(27, 32, 39, 0.12)',
  xl: '0 16px 40px rgba(27, 32, 39, 0.16)',
} as const

/** Mobile-first breakpoints (em, Mantine's defaults made explicit). Tablet = sm, desktop = md. */
export const breakpoints = {
  xs: '36em',
  sm: '48em',
  md: '62em',
  lg: '75em',
  xl: '88em',
} as const

/** System fonts: no web font download, and every script our residents read is covered. */
export const fontFamily =
  "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', 'Noto Sans Arabic', 'Helvetica Neue', Arial, sans-serif"

export const fontFamilyMonospace = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace"

/** Minimum touch target for resident controls (px). */
export const TOUCH_TARGET_PX = 48

/**
 * The only type scale: six styles. `Text` exposes them as `variant`.
 * `large` marks WCAG "large text" (≥ 24px, or ≥ 18.66px bold), allowed 3:1 contrast.
 */
export const typeScale = {
  display: { fontSize: '2rem', lineHeight: '1.2', fontWeight: 700, element: 'h1', large: true },
  title: { fontSize: '1.5rem', lineHeight: '1.25', fontWeight: 700, element: 'h2', large: true },
  heading: { fontSize: '1.1875rem', lineHeight: '1.35', fontWeight: 700, element: 'h3', large: true },
  body: { fontSize: '1rem', lineHeight: '1.55', fontWeight: 400, element: 'p', large: false },
  label: { fontSize: '1rem', lineHeight: '1.4', fontWeight: 600, element: 'span', large: false },
  caption: { fontSize: '0.875rem', lineHeight: '1.45', fontWeight: 400, element: 'span', large: false },
} as const

export type TextVariant = keyof typeof typeScale

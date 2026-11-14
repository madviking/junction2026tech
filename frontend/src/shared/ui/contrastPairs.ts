import { semanticColors as s, tones, type Tone } from '@/shared/ui/tokens'

export interface ContrastPair {
  name: string
  foreground: string
  background: string
  /** Which WCAG minimum applies: normal text 4.5:1, large text and UI components 3:1. */
  kind: 'normalText' | 'largeText' | 'uiComponent'
}

const toneNames = Object.keys(tones) as Tone[]

/**
 * Every foreground/background pair the primitives actually render.
 * Add a pair here when a primitive starts using a new combination; the unit test
 * and the /design-system page both read this list.
 */
export const contrastPairs: ContrastPair[] = [
  { name: 'text on surface', foreground: s.text, background: s.surface, kind: 'normalText' },
  { name: 'text on background', foreground: s.text, background: s.background, kind: 'normalText' },
  { name: 'text on hovered surface', foreground: s.text, background: s.surfaceHover, kind: 'normalText' },
  { name: 'text on selected surface', foreground: s.text, background: s.surfaceSelected, kind: 'normalText' },
  { name: 'muted text on surface', foreground: s.textMuted, background: s.surface, kind: 'normalText' },
  { name: 'muted text on background', foreground: s.textMuted, background: s.background, kind: 'normalText' },
  { name: 'muted text on selected surface', foreground: s.textMuted, background: s.surfaceSelected, kind: 'normalText' },
  { name: 'link on surface', foreground: s.link, background: s.surface, kind: 'normalText' },
  { name: 'emergency text on surface', foreground: s.emergency, background: s.surface, kind: 'normalText' },
  { name: 'white on primary', foreground: s.textOnFilled, background: s.primary, kind: 'normalText' },
  { name: 'white on primary hover', foreground: s.textOnFilled, background: s.primaryHover, kind: 'normalText' },
  { name: 'white on emergency', foreground: s.textOnFilled, background: s.emergency, kind: 'normalText' },
  { name: 'white on emergency hover', foreground: s.textOnFilled, background: s.emergencyHover, kind: 'normalText' },
  { name: 'focus ring on surface', foreground: s.focus, background: s.surface, kind: 'uiComponent' },
  { name: 'focus ring on background', foreground: s.focus, background: s.background, kind: 'uiComponent' },
  { name: 'control border on surface', foreground: s.border, background: s.surface, kind: 'uiComponent' },
  { name: 'control border on background', foreground: s.border, background: s.background, kind: 'uiComponent' },
  { name: 'selected border on surface', foreground: s.primary, background: s.surface, kind: 'uiComponent' },
  { name: 'tile pictogram / body part outline on info background', foreground: s.primary, background: tones.info.bg, kind: 'uiComponent' },
  { name: 'chosen body part on background', foreground: s.primary, background: s.background, kind: 'uiComponent' },
  ...toneNames.flatMap((tone): ContrastPair[] => [
    { name: `${tone} text on ${tone} background`, foreground: tones[tone].fg, background: tones[tone].bg, kind: 'normalText' },
    { name: `body text on ${tone} background`, foreground: s.text, background: tones[tone].bg, kind: 'normalText' },
    { name: `${tone} text on surface`, foreground: tones[tone].fg, background: s.surface, kind: 'normalText' },
    { name: `white on ${tone}`, foreground: s.textOnFilled, background: tones[tone].solid, kind: 'normalText' },
    { name: `${tone} accent border on surface`, foreground: tones[tone].border, background: s.surface, kind: 'uiComponent' },
  ]),
]

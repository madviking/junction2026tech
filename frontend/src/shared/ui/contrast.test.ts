import { describe, expect, it } from 'vitest'
import { AA, contrastRatio } from '@/shared/ui/contrast'
import { contrastPairs } from '@/shared/ui/contrastPairs'

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2)
  })
})

describe('semantic colour pairs meet WCAG 2.2 AA', () => {
  it.each(contrastPairs.map((pair) => [pair.name, pair] as const))('%s', (_name, pair) => {
    const minimum = AA[pair.kind]
    expect(contrastRatio(pair.foreground, pair.background)).toBeGreaterThanOrEqual(minimum)
  })

  it('covers every text role, every tone and the control boundaries', () => {
    const names = contrastPairs.map((pair) => pair.name)
    expect(names).toEqual(expect.arrayContaining(['text on surface', 'muted text on background', 'focus ring on surface', 'control border on surface', 'warning text on warning background', 'white on emergency']))
  })
})

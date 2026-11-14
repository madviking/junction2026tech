import { describe, expect, it } from 'vitest'
import type { LiveBundle } from '@/shared/api/types'
import { translate } from '@/shared/i18n/translate'

const bundle = {
  texts: {
    'rule.U2.title': { text: 'Contact the {door} today', lang: 'en', review: 'unchecked', fallback: false },
  },
} as unknown as LiveBundle

describe('translate', () => {
  it('fills placeholders and shows missing keys as the key', () => {
    expect(translate(bundle, 'rule.U2.title', { door: 'health station' })).toBe('Contact the health station today')
    expect(translate(bundle, 'rule.U2.title')).toBe('Contact the {door} today')
    expect(translate(bundle, 'ui.nope')).toBe('ui.nope')
  })
})

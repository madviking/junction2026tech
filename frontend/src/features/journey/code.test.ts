import { describe, expect, it } from 'vitest'
import { isUnknownCode } from '@/features/journey/code'
import { clockLabelKey, scriptKey, thenKey } from '@/features/journey/keys'
import { APIError, ErrCode } from '@/shared/api/client'

describe('isUnknownCode', () => {
  it('is true only for not_found', () => {
    expect(isUnknownCode(new APIError(404, { code: ErrCode.NotFound, message: 'visit not found' }))).toBe(true)
    expect(isUnknownCode(new APIError(400, { code: ErrCode.InvalidArgument, message: 'bad outcome' }))).toBe(false)
    expect(isUnknownCode(new Error('network'))).toBe(false)
  })
})

describe('content keys', () => {
  it('uses the route-specific script when the content has it', () => {
    const has = (key: string) => key === 'rule.U2.A5.script'
    expect(scriptKey('U2', 'A5', has)).toBe('rule.U2.A5.script')
    expect(scriptKey('U2', 'A1', has)).toBe('rule.U2.script')
  })

  it('finds the clock label key in the clock set that holds the shown label', () => {
    const texts: Record<string, string> = {
      'rule.U2.script': 's',
      'rule.U2.clocks.0.label': 'Assessment of need',
      'rule.U2.no_guarantee.0.label': 'Ask the clinic',
    }
    const has = (key: string) => key in texts
    const t = (key: string) => texts[key] ?? key
    expect(clockLabelKey('U2', 'A1', 0, 'Assessment of need', has, t)).toBe('rule.U2.clocks.0.label')
    expect(clockLabelKey('U2', 'A7', 0, 'Ask the clinic', has, t)).toBe('rule.U2.no_guarantee.0.label')
    expect(clockLabelKey('U2', 'A1', 3, 'Missing', has, t)).toBeUndefined()
  })

  it('finds the key of the last then-text', () => {
    const texts: Record<string, string> = { 'journey.outcome.contact.no_answer.then': 'Call 116117' }
    const has = (key: string) => key in texts
    const t = (key: string) => texts[key] ?? key
    expect(thenKey('Call 116117', { stage: 'contact', outcome: 'no_answer' }, has, t)).toBe('journey.outcome.contact.no_answer.then')
    expect(thenKey('Something else', { stage: 'contact', outcome: 'no_answer' }, has, t)).toBeUndefined()
  })
})

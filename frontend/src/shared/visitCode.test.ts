import { describe, expect, it } from 'vitest'
import { normalizeVisitCode } from '@/shared/visitCode'

describe('normalizeVisitCode (mirror of backend/visits/code.ts)', () => {
  it.each([
    ['SLT-GZDQ-CX7N', 'SLT-GZDQ-CX7N'],
    ['slt-gzdq-cx7n', 'SLT-GZDQ-CX7N'],
    [' gzdq cx7n ', 'SLT-GZDQ-CX7N'],
    ['SLTGZDQCX7N', 'SLT-GZDQ-CX7N'],
    ['SLT-OOIL-0000', 'SLT-0011-0000'],
  ])('%j → %s', (input, code) => expect(normalizeVisitCode(input)).toBe(code))

  it.each(['', 'SLT-GZDQ-CX7', 'SLT-GZDQ-CX7U', 'hello world', 'SLT-AB12-CD34-EF', 'SLT-AB_2-CD34'])('rejects %j', (input) =>
    expect(normalizeVisitCode(input)).toBeNull(),
  )
})

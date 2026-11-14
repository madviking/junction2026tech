import { describe, expect, it } from 'vitest'
import { stripIdentifiers } from './redact'

const gone = (out: string, ...parts: string[]) => {
  for (const p of parts) expect(out).not.toContain(p)
}

describe('stripIdentifiers', () => {
  it('removes English self-introductions and the name', () => {
    const a = stripIdentifiers('My name is Maria Virtanen and I found a lump')
    gone(a, 'Maria', 'Virtanen')
    expect(a).toContain('and I found a lump')

    const b = stripIdentifiers("Hi, this is John Smith. I'm called Jo too. I am called Ann Lee")
    gone(b, 'John', 'Smith', 'Ann', 'Lee')
  })

  it('keeps symptom sentences that only look like introductions', () => {
    for (const s of [
      'I am worried about a lump',
      'This is my third week of coughing',
      'Olen yskinyt kuukauden',
      'Olen huolissani kyhmystä',
    ]) {
      expect(stripIdentifiers(s)).toBe(s)
    }
  })

  it('removes Finnish self-introductions and the name', () => {
    const a = stripIdentifiers('Nimeni on Matti Meikäläinen, olen yskinyt kuukauden')
    gone(a, 'Matti', 'Meikäläinen')
    expect(a).toContain('olen yskinyt kuukauden')

    gone(stripIdentifiers('Minun nimeni on Aino Laine'), 'Aino', 'Laine')
    const c = stripIdentifiers('Olen Aino Laine ja minulla on kyhmy')
    gone(c, 'Aino', 'Laine')
    expect(c).toContain('ja minulla on kyhmy')
  })

  it('removes the next words after Arabic and Somali introductions', () => {
    const ar = stripIdentifiers('اسمي فاطمة أحمد. عندي كتلة في صدري')
    gone(ar, 'فاطمة', 'أحمد')
    expect(ar).toContain('عندي كتلة في صدري')

    const so = stripIdentifiers('Magacaygu waa Hodan Ali. Waxaan qabaa qufac')
    gone(so, 'Hodan', 'Ali')
    expect(so).toContain('Waxaan qabaa qufac')
  })

  it('removes street addresses', () => {
    gone(stripIdentifiers('I live at Hämeentie 15 B 7 and have a cough'), 'Hämeentie', '15', 'B 7')
    gone(stripIdentifiers('Asun Kauppakatu 3:ssa'), 'Kauppakatu')
    gone(stripIdentifiers('My home is 12 Baker Street'), 'Baker', '12')
    expect(stripIdentifiers('A cough for over 3 weeks')).toBe('A cough for over 3 weeks')
  })
})

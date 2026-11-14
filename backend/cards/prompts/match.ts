// Instructions for the cards.match classifier (Decisions API, one choice question).
import type { CardSet } from '../options'

const COMMON =
  'The person may write in any language and may be vague. Each option gives the card ' +
  'text in English and, after "|", in the person\'s language. Choose the single card ' +
  'that matches what the person says. Do not guess beyond their words: when several ' +
  'cards fit equally or none fits, spread the probability across them.'

const BY_SET: Record<CardSet, string> = {
  symptoms:
    'A person in Finland describes, in their own words, a health change that worries them. ' +
    'Which symptom card matches what they describe?',
  route:
    'A person in Finland describes their situation (residence, work, studies, insurance, ' +
    'permit). Which card describes where they get health care?',
  outcomes:
    'A person in Finland describes what happened at this step of getting care. ' +
    'Which card matches what happened?',
}

export function matchInstructions(set: CardSet): string {
  return `${BY_SET[set]} ${COMMON}`
}

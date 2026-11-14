import type { GraphOutcome, JourneyGraph } from '@/features/admin-journey/types'

const outcome = (id: string, card: string, next: string): GraphOutcome => ({
  id,
  card,
  next,
  sets: null,
  setsLane: null,
  review: null,
  maxTries: null,
  afterMax: null,
  climb: false,
})

/** A small journey for tests: describe → contact → closed, one broken link, one interrupt stage, one orphan. */
export const testGraph: JourneyGraph = {
  enabled: true,
  source: 'draft',
  basedOnVersion: 4,
  start: 'describe',
  stages: [
    { id: 'describe', terminal: false, ask: 'What do you need help with?', ladder: 0, outcomes: [outcome('symptom', 'I have a symptom', 'contact')] },
    {
      id: 'contact',
      terminal: false,
      ask: 'What happened when you contacted them?',
      ladder: 0,
      outcomes: [outcome('got_time', 'I got an appointment', 'closed'), outcome('moved', 'I moved away', 'nowhere')],
    },
    { id: 'emergency', terminal: false, ask: 'Call 112', ladder: 0, outcomes: [outcome('changed', 'Something changed', 'describe')] },
    { id: 'orphan', terminal: false, ask: 'Lost?', ladder: 0, outcomes: [outcome('done', 'Done', 'closed')] },
    { id: 'closed', terminal: true, ask: null, ladder: 0, outcomes: [] },
  ],
  interrupts: [{ id: 'emergency_sign', card: 'This is an emergency', next: 'emergency' }],
  issues: [
    { severity: 'error', path: 'journey.stages.contact.outcomes.moved.next', message: 'unknown stage nowhere' },
    { severity: 'warning', path: 'journey.stages.orphan', message: 'no path leads to this stage' },
  ],
  reviewFlags: [{ kind: 'legal', path: 'journey.stages.contact.outcomes.refused', message: 'Outcome contact → refused needs legal review' }],
}

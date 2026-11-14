import { describe, expect, it } from 'vitest'
import { distances, idProblem, incomingLinks, layoutColumns, outcomeIssues, sortIssues, stageIssues } from '@/features/admin-journey/lib/layout'
import { issueStage, nextStageId, OTHER_STAGE } from '@/features/admin-journey/lib/nextStage'
import { testGraph } from '@/features/admin-journey/testGraph'

describe('journey graph layout', () => {
  it('puts stages in columns by distance from the start, interrupt-only and unreachable stages last', () => {
    const columns = layoutColumns(testGraph)
    expect(columns.map((c) => [c.title, c.kind, c.stages.map((s) => s.id)])).toEqual([
      ['Start', 'distance', ['describe']],
      ['Step 1', 'distance', ['contact']],
      ['Step 2', 'distance', ['closed']],
      ['Reached by an interrupt', 'interrupt', ['emergency']],
      ['Not reachable', 'unreachable', ['orphan']],
    ])
  })

  it('lists the links into each stage: outcomes of other stages, then interrupts', () => {
    const incoming = incomingLinks(testGraph)
    expect(incoming.get('contact')).toEqual([{ kind: 'outcome', stage: 'describe', id: 'symptom' }])
    expect(incoming.get('closed')).toEqual([
      { kind: 'outcome', stage: 'contact', id: 'got_time' },
      { kind: 'outcome', stage: 'orphan', id: 'done' },
    ])
    expect(incoming.get('emergency')).toEqual([{ kind: 'interrupt', id: 'emergency_sign' }])
    expect(incoming.get('orphan') ?? []).toEqual([])
  })

  it('skips links to unknown stages and handles cycles', () => {
    const d = distances(testGraph, ['emergency'])
    expect([...d.entries()]).toEqual([
      ['emergency', 0],
      ['describe', 1],
      ['contact', 2],
      ['closed', 3],
    ])
    expect(distances(testGraph, ['nope']).size).toBe(0)
  })

  it('finds the issues of a stage and of an outcome, errors first', () => {
    expect(stageIssues(testGraph.issues, 'contact').map((i) => i.message)).toEqual(['unknown stage nowhere'])
    expect(stageIssues(testGraph.issues, 'cont')).toEqual([])
    expect(outcomeIssues(testGraph.issues, 'contact', 'moved')).toHaveLength(1)
    expect(sortIssues([...testGraph.issues].reverse()).map((i) => i.severity)).toEqual(['error', 'warning'])
    expect(issueStage('journey.stages.contact.outcomes.moved.next')).toBe('contact')
    expect(issueStage('texts.x.en')).toBeNull()
  })

  it('checks ids like the backend and reads the next-stage choice', () => {
    expect(idProblem('moved_away', [])).toBeNull()
    expect(idProblem('Moved', [])).toMatch(/lowercase/)
    expect(idProblem('x', [])).toMatch(/lowercase/)
    expect(idProblem('wait', ['wait'])).toMatch(/already/)
    expect(nextStageId({ choice: 'closed', other: 'x' })).toBe('closed')
    expect(nextStageId({ choice: OTHER_STAGE, other: ' later_stage ' })).toBe('later_stage')
    expect(nextStageId({ choice: null, other: '' })).toBe('')
  })
})

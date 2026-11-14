// County view: fixed figures from county_figures plus anonymous visit counts.
import { APIError } from 'encore.dev/api'
import { visits } from '~encore/clients'
import * as repo from './repository'
import type { CountyFigure } from './repository'

export interface StageCount {
  lang: string
  stage: string
  count: number
}

export interface OutcomeCount {
  lang: string
  stage: string
  outcome: string
  count: number
}

export interface CountyView {
  id: string
  name: string
  figures: CountyFigure[]
  topLanguages: string[]
  counts: { total: number; byStage: StageCount[]; byOutcome: OutcomeCount[] }
  generatedAt: string
}

export async function getCounty(id: string): Promise<CountyView> {
  const county = await repo.findCounty(id)
  if (!county) throw APIError.notFound(`unknown county ${id}`)
  const counts = await visits.countyCounts({ county: id })
  return { ...county, counts, generatedAt: new Date().toISOString() }
}

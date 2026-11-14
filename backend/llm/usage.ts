// Read side of llm_usage for the admin usage page and the spend total.
import { totalSpendUsd, usageSummary, type UsageSummaryRow } from './repository'

export interface UsageSummary {
  rows: UsageSummaryRow[]
}

export interface Spend {
  usd: number
}

export async function summary(): Promise<UsageSummary> {
  return { rows: await usageSummary() }
}

export async function spend(): Promise<Spend> {
  return { usd: await totalSpendUsd() }
}

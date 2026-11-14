import type { VisitHistoryItem } from '@/features/visit-card/types'

type Has = (key: string) => boolean
type T = (key: string) => string

/** One history entry as "question → answer" in the resident's language, from the content keys. */
export function historyText(item: VisitHistoryItem, t: T, has: Has): string {
  const outcomeKey = [`journey.outcome.${item.stage}.${item.outcome}.card`, `journey.interrupt.${item.outcome}.card`].find(has)
  const answer = outcomeKey ? t(outcomeKey) : item.outcome
  const askKey = `journey.stage.${item.stage}.ask`
  return has(askKey) ? `${t(askKey)} → ${answer}` : answer
}

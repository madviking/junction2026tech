import { useMemo } from 'react'
import { ColumnBoard } from '@/shared/ui/extra/ColumnBoard'
import { StageCard, type StageCardProps } from '@/features/admin-journey/components/StageCard'
import { incomingLinks, layoutColumns, stageDomId } from '@/features/admin-journey/lib/layout'
import type { JourneyGraph } from '@/features/admin-journey/types'
import type { IncomingLink } from '@/features/admin-journey/lib/layout'

const NO_LINKS: IncomingLink[] = []

type StageActions = Omit<StageCardProps, 'stage' | 'isStart' | 'column' | 'issues' | 'stageIds' | 'incoming' | 'onAddOutcome' | 'onChangeNext'> & {
  onAddOutcome: (stageId: string) => void
  onChangeNext: (stageId: string, outcomeId: string) => void
}

export interface JourneyGraphViewProps extends StageActions {
  graph: JourneyGraph
  highlightedStage: string | null
}

/** The stages in columns by distance from the start (BFS over outcome `next`), unreachable ones last. */
export function JourneyGraphView({ graph, highlightedStage, onAddOutcome, onChangeNext, ...actions }: JourneyGraphViewProps) {
  const columns = useMemo(() => layoutColumns(graph), [graph])
  const stageIds = useMemo(() => new Set(graph.stages.map((s) => s.id)), [graph])
  const incoming = useMemo(() => incomingLinks(graph), [graph])
  return (
    <ColumnBoard
      label="Journey stages"
      highlightedId={highlightedStage ? stageDomId(highlightedStage) : null}
      columns={columns.map((column) => ({
        key: column.key,
        title: column.title,
        items: column.stages.map((stage) => ({
          id: stageDomId(stage.id),
          content: (
            <StageCard
              {...actions}
              stage={stage}
              isStart={stage.id === graph.start}
              column={column.kind}
              issues={graph.issues}
              stageIds={stageIds}
              incoming={incoming.get(stage.id) ?? NO_LINKS}
              onAddOutcome={() => onAddOutcome(stage.id)}
              onChangeNext={(outcomeId) => onChangeNext(stage.id, outcomeId)}
            />
          ),
        })),
      }))}
    />
  )
}

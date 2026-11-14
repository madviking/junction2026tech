import { useMemo } from 'react'
import type { CountyOutcomeCount, CountyStageCount } from '@/features/county/types'
import { useContent } from '@/shared/i18n'
import { EmptyState, Section, Stack } from '@/shared/ui'
import { DataTable, type DataTableColumn } from '@/shared/ui/admin'

export interface CountsTablesProps {
  byStage: CountyStageCount[]
  byOutcome: CountyOutcomeCount[]
}

/** Anonymous counts of current stage and of outcomes, by language (arrays come ordered). */
export function CountsTables({ byStage, byOutcome }: CountsTablesProps) {
  const { t, has } = useContent()
  const empty = <EmptyState title={t('ui.county.no_counts')} description={t('ui.county.no_counts_detail')} />

  const { stageColumns, outcomeColumns } = useMemo(() => {
    const label = (keys: string[], fallback: string) => {
      const key = keys.find(has)
      return key ? t(key) : fallback
    }
    const language = (code: string) => label([`ui.county.lang.${code}`], code)
    const stage = (id: string) => label([`ui.county.stage.${id}`], id)
    const outcome = (row: CountyOutcomeCount) =>
      label([`journey.outcome.${row.stage}.${row.outcome}.card`, `journey.interrupt.${row.outcome}.card`], row.outcome)
    const langColumn = { key: 'lang', header: t('ui.county.col_language'), render: (r: { lang: string }) => language(r.lang) }
    const stageColumn = { key: 'stage', header: t('ui.county.col_stage'), render: (r: { stage: string }) => stage(r.stage) }
    const countColumn = { key: 'count', header: t('ui.county.col_count'), render: (r: { count: number }) => r.count, numeric: true }
    return {
      stageColumns: [langColumn, stageColumn, countColumn] as DataTableColumn<CountyStageCount>[],
      outcomeColumns: [
        langColumn,
        stageColumn,
        { key: 'outcome', header: t('ui.county.col_outcome'), render: outcome },
        countColumn,
      ] as DataTableColumn<CountyOutcomeCount>[],
    }
  }, [t, has])

  return (
    <Stack gap="lg">
      <Section title={t('ui.county.by_stage')} level={3}>
        <DataTable
          label={t('ui.county.by_stage')}
          columns={stageColumns}
          rows={byStage}
          rowKey={(r) => `${r.lang}:${r.stage}`}
          emptyState={empty}
          minWidth={320}
        />
      </Section>
      <Section title={t('ui.county.by_outcome')} level={3}>
        <DataTable
          label={t('ui.county.by_outcome')}
          columns={outcomeColumns}
          rows={byOutcome}
          rowKey={(r) => `${r.lang}:${r.stage}:${r.outcome}`}
          emptyState={empty}
          minWidth={420}
        />
      </Section>
    </Stack>
  )
}

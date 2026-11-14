import { useState } from 'react'
import { useNavigate } from 'react-router'
import { adminErrorMessage } from '@/features/admin-auth'
import { useAreas, useCompare } from '@/features/admin-service-paths/api/servicePaths'
import { AreasTable } from '@/features/admin-service-paths/components/AreasTable'
import { CompareMetricsTable, CompareStepsTable } from '@/features/admin-service-paths/components/CompareTables'
import { ErrorState, LoadingState, Section, Stack } from '@/shared/ui'
import { Tabs } from '@/shared/ui/admin'

const TABS = [
  { value: 'areas', label: 'Areas' },
  { value: 'compare', label: 'Compare' },
]

function AreasTab() {
  const areas = useAreas()
  const navigate = useNavigate()
  if (areas.isPending) return <LoadingState label="Loading areas" />
  if (areas.isError)
    return <ErrorState title="Could not load areas" message={adminErrorMessage(areas.error)} onRetry={() => areas.refetch()} retrying={areas.isFetching} />
  return <AreasTable areas={areas.data} onOpen={(a) => navigate(`/admin/service-paths/${a.id}`)} />
}

function CompareTab() {
  const compare = useCompare()
  if (compare.isPending) return <LoadingState label="Loading the comparison" />
  if (compare.isError)
    return (
      <ErrorState
        title="Could not load the comparison"
        message={adminErrorMessage(compare.error)}
        onRetry={() => compare.refetch()}
        retrying={compare.isFetching}
      />
    )
  return (
    <Stack gap="xl">
      <Section title="Measured values" description="Published values only. Green is better than Finland in the same period, red is worse.">
        <CompareMetricsTable view={compare.data} />
      </Section>
      <Section title="How each stage works" description="Published steps beside the national limit, which is the same in every area.">
        <CompareStepsTable view={compare.data} />
      </Section>
    </Stack>
  )
}

/** `/admin/service-paths`: areas with fact counts, and the area × stage comparison. */
export function ServicePathsPage() {
  const [tab, setTab] = useState('areas')
  return (
    <Stack gap="lg">
      <Section
        level={1}
        eyebrow="Service paths"
        title="Service paths by area"
        description="Doors, stages, screening and measured waits per area. Every fact cites a source; only published facts reach residents and the comparison."
      />
      <Tabs label="Service paths" items={TABS} value={tab} onChange={setTab}>
        {tab === 'areas' ? <AreasTab /> : <CompareTab />}
      </Tabs>
    </Stack>
  )
}

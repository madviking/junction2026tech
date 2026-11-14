import { IconDownload } from '@tabler/icons-react'
import { useCallback, useState } from 'react'
import { adminErrorMessage } from '@/features/admin-auth'
import { useExportLive, useRollback } from '@/features/admin-content/api/mutations'
import { useVersions } from '@/features/admin-content/api/queries'
import { VersionsTable } from '@/features/admin-content/components/VersionsTable'
import type { ReleaseInfo } from '@/features/admin-content/types'
import { ActionButton, Banner, ErrorState, LoadingState, Row, Section, Stack } from '@/shared/ui'

/** `/admin/versions`: published versions, roll back (with confirm), export rules.yaml. */
export function VersionsPage() {
  const versions = useVersions()
  const rollback = useRollback()
  const exportLive = useExportLive()
  const [confirming, setConfirming] = useState<ReleaseInfo | null>(null)
  const askRollback = useCallback((version: ReleaseInfo) => {
    setConfirming(version)
  }, [])

  const exportButton = (
    <ActionButton variant="secondary" compact icon={<IconDownload size={18} aria-hidden="true" />} loading={exportLive.isPending} onPress={() => exportLive.mutate()}>
      Export live as rules.yaml
    </ActionButton>
  )

  return (
    <Stack gap="lg">
      <Section level={1} eyebrow="Content" title="Versions" description="Every publish makes a new version. Rolling back makes an older version live again; nothing is deleted." aside={exportButton}>
        {exportLive.isError && (
          <Banner tone="warning" title="Export failed">
            {adminErrorMessage(exportLive.error)}
          </Banner>
        )}
        {confirming && (
          <Banner
            tone="warning"
            title={`Roll back to version ${confirming.version}?`}
            action={
              <Row gap="sm">
                <ActionButton
                  variant="danger"
                  compact
                  loading={rollback.isPending}
                  onPress={() => rollback.mutate(confirming.version, { onSuccess: () => setConfirming(null) })}
                >
                  {`Make version ${confirming.version} live`}
                </ActionButton>
                <ActionButton variant="subtle" compact onPress={() => setConfirming(null)}>
                  Cancel
                </ActionButton>
              </Row>
            }
          >
            Residents see the texts of that version immediately. A draft, if any, stays as it is.
          </Banner>
        )}
        {rollback.isError && (
          <Banner tone="warning" title="Roll back failed">
            {adminErrorMessage(rollback.error)}
          </Banner>
        )}
        {rollback.isSuccess && !confirming && (
          <Banner tone="success" title={`Version ${rollback.data.version} is live`}>
            The resident screens now show this version.
          </Banner>
        )}
        {versions.isPending ? (
          <LoadingState label="Loading versions" />
        ) : versions.isError ? (
          <ErrorState title="Could not load versions" message={adminErrorMessage(versions.error)} onRetry={() => versions.refetch()} retrying={versions.isFetching} />
        ) : (
          <VersionsTable versions={versions.data.versions} onRollback={askRollback} />
        )}
      </Section>
    </Stack>
  )
}

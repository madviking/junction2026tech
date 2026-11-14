import { adminErrorMessage } from '@/features/admin-auth'
import { AUDIT_LIMIT, useAuditLog, useUsageReport } from '@/features/admin-usage/api/usage'
import { AuditTable } from '@/features/admin-usage/components/AuditTable'
import { UsageTable } from '@/features/admin-usage/components/UsageTable'
import { UsageTotals } from '@/features/admin-usage/components/UsageTotals'
import { ErrorState, LoadingState, Section, Stack } from '@/shared/ui'

/** `/admin/usage`: paid spend per provider, usage rows, and the audit log. */
export function UsagePage() {
  const usage = useUsageReport()
  const audit = useAuditLog()
  return (
    <Stack gap="xl">
      <Section level={1} eyebrow="Usage and audit" title="Paid usage" description="Spend on LLM and voice providers, from the usage rows every call records.">
        {usage.isPending ? (
          <LoadingState label="Loading usage" />
        ) : usage.isError ? (
          <ErrorState title="Could not load usage" message={adminErrorMessage(usage.error)} onRetry={() => usage.refetch()} retrying={usage.isFetching} />
        ) : (
          <Stack gap="lg">
            <UsageTotals report={usage.data} />
            <UsageTable rows={usage.data.rows} />
          </Stack>
        )}
      </Section>
      <Section title="Audit log" description={`Who changed what, newest first (last ${AUDIT_LIMIT} entries).`}>
        {audit.isPending ? (
          <LoadingState label="Loading audit log" />
        ) : audit.isError ? (
          <ErrorState title="Could not load the audit log" message={adminErrorMessage(audit.error)} onRetry={() => audit.refetch()} retrying={audit.isFetching} />
        ) : (
          <AuditTable entries={audit.data.entries} />
        )}
      </Section>
    </Stack>
  )
}

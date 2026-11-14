import { useMemo, useState } from 'react'
import { adminErrorMessage } from '@/features/admin-auth'
import { useAdminTexts, useDraft, useReviewFlags } from '@/features/admin-content/api/queries'
import { usePublish, useDiscard, useSetReview, useSetText } from '@/features/admin-content/api/mutations'
import { DraftPanel } from '@/features/admin-content/components/DraftPanel'
import { ReviewFlagsList } from '@/features/admin-content/components/ReviewFlagsList'
import { TextDrawer } from '@/features/admin-content/components/TextDrawer'
import { TextFiltersBar } from '@/features/admin-content/components/TextFiltersBar'
import { TextsTable } from '@/features/admin-content/components/TextsTable'
import { issuesFromError } from '@/features/admin-content/lib/format'
import { useDebouncedValue } from '@/features/admin-content/state/useDebouncedValue'
import type { TextFilters, TextRow } from '@/features/admin-content/types'
import { ErrorState, LoadingState, Section, Stack, SurfaceCard } from '@/shared/ui'
import { Tabs } from '@/shared/ui/admin'

const INITIAL_FILTERS: TextFilters = { lang: '', filter: 'all', group: '', search: '' }

/** `/admin/content`: draft panel, text list with filters, editor drawer, review flags. */
export function ContentPage() {
  const [filters, setFilters] = useState<TextFilters>(INITIAL_FILTERS)
  const search = useDebouncedValue(filters.search)
  const queryFilters = useMemo(() => ({ ...filters, search }), [filters, search])
  const texts = useAdminTexts(queryFilters)
  const draft = useDraft()
  const flags = useReviewFlags()
  const setText = useSetText()
  const setReview = useSetReview()
  const publish = usePublish()
  const discard = useDiscard()
  const [tab, setTab] = useState('texts')
  const [selected, setSelected] = useState<TextRow | null>(null)

  // The open row follows fresh data; it stays open even when a filter would now hide it.
  const openRow = selected ? (texts.data?.rows.find((r) => r.key === selected.key) ?? selected) : null
  const languages = texts.data?.languages ?? []

  const tabItems = useMemo(
    () => [
      { value: 'texts', label: texts.data ? `Texts (${texts.data.rows.length})` : 'Texts' },
      { value: 'flags', label: flags.data ? `Review flags (${flags.data.flags.length})` : 'Review flags' },
    ],
    [texts.data, flags.data],
  )

  const publishError = publish.error ? { message: adminErrorMessage(publish.error), issues: issuesFromError(publish.error) } : null
  const saveError =
    setText.error && setText.variables ? { lang: setText.variables.lang, message: adminErrorMessage(setText.error) } : null

  return (
    <Stack gap="lg">
      <Section level={1} eyebrow="Content" title="Texts and draft" description="Edit texts in every language. Residents see changes only after you publish the draft.">
        <SurfaceCard>
          {draft.isPending ? (
            <LoadingState label="Loading draft" />
          ) : draft.isError ? (
            <ErrorState title="Could not load the draft" message={adminErrorMessage(draft.error)} onRetry={() => draft.refetch()} retrying={draft.isFetching} />
          ) : (
            <DraftPanel
              draft={draft.data}
              publishing={publish.isPending}
              publishError={publishError}
              publishedVersion={publish.isSuccess ? publish.data.version : null}
              onPublish={(note) => publish.mutate(note)}
              discarding={discard.isPending}
              onDiscard={() => discard.mutate(undefined, { onSuccess: () => publish.reset() })}
            />
          )}
        </SurfaceCard>
      </Section>

      <Tabs label="Content views" items={tabItems} value={tab} onChange={setTab}>
        {tab === 'texts' ? (
          texts.isPending ? (
            <LoadingState label="Loading texts" />
          ) : texts.isError ? (
            <ErrorState title="Could not load texts" message={adminErrorMessage(texts.error)} onRetry={() => texts.refetch()} retrying={texts.isFetching} />
          ) : (
            <TextsTable
              rows={texts.data.rows}
              languages={languages}
              onOpen={setSelected}
              toolbar={<TextFiltersBar filters={filters} languages={languages} onChange={setFilters} />}
            />
          )
        ) : flags.isPending ? (
          <LoadingState label="Loading review flags" />
        ) : flags.isError ? (
          <ErrorState title="Could not load review flags" message={adminErrorMessage(flags.error)} onRetry={() => flags.refetch()} retrying={flags.isFetching} />
        ) : (
          <SurfaceCard>
            <ReviewFlagsList flags={flags.data.flags} />
          </SurfaceCard>
        )}
      </Tabs>

      <TextDrawer
        row={openRow}
        languages={languages}
        onClose={() => {
          setSelected(null)
          setText.reset()
        }}
        onSave={(lang, text) => {
          if (!openRow) return
          setText.mutate({ key: openRow.key, lang, text }, { onSuccess: () => publish.reset() })
        }}
        savingLang={setText.isPending ? setText.variables?.lang : null}
        saveError={saveError}
        onReview={(lang, status) => openRow && setReview.mutate({ key: openRow.key, lang, status })}
        reviewingLang={setReview.isPending ? setReview.variables?.lang : null}
      />
    </Stack>
  )
}

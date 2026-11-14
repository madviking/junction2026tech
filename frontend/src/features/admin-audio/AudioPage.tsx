import { useMemo, useState } from 'react'
import { adminApiBase, adminErrorMessage } from '@/features/admin-auth'
import { useApproveAudio, useAudioAssets, useGenerateAudio, useUploadRecording, useVoiceLanguages } from '@/features/admin-audio/api/audio'
import { AssetDrawer } from '@/features/admin-audio/components/AssetDrawer'
import { AssetsTable } from '@/features/admin-audio/components/AssetsTable'
import { AudioFilters } from '@/features/admin-audio/components/AudioFilters'
import { assetUrl } from '@/features/admin-audio/lib/files'
import { useAudioPreview } from '@/features/admin-audio/state/useAudioPreview'
import type { AudioAssetRow, ServedFilter, VoiceLanguage } from '@/features/admin-audio/types'
import { ErrorState, LoadingState, Section, Stack } from '@/shared/ui'

const NO_LANGUAGES: VoiceLanguage[] = []

function matches(row: AudioAssetRow, show: ServedFilter, search: string) {
  if (show === 'human' && row.served !== 'human') return false
  if (show === 'generated' && row.served !== 'generated') return false
  if (show === 'none' && row.served !== null) return false
  if (show === 'unapproved' && row.human?.review !== 'unchecked') return false
  if (show === 'stale' && row.staleAssets === 0) return false
  if (!search) return true
  const needle = search.toLowerCase()
  return row.key.toLowerCase().includes(needle) || row.text.toLowerCase().includes(needle)
}

/** `/admin/audio`: audio per text key in one language; listen, generate, upload and approve. */
export function AudioPage() {
  const [lang, setLang] = useState('en')
  const [show, setShow] = useState<ServedFilter>('all')
  const [search, setSearch] = useState('')
  const [openKey, setOpenKey] = useState<string | null>(null)
  const languages = useVoiceLanguages()
  const assets = useAudioAssets(lang)
  const generate = useGenerateAudio()
  const upload = useUploadRecording()
  const approve = useApproveAudio()
  const preview = useAudioPreview()

  const rows = useMemo(() => (assets.data?.rows ?? []).filter((row) => matches(row, show, search.trim())), [assets.data, show, search])
  const openRow = openKey ? (assets.data?.rows.find((row) => row.key === openKey) ?? null) : null
  const capability = languages.data?.languages.find((l) => l.lang === lang)
  const listen = preview.toggle
  const listenUrl = useMemo(() => (url: string) => listen(assetUrl(adminApiBase, url)), [listen])
  const listenState = useMemo(() => (url: string) => preview.stateOf(assetUrl(adminApiBase, url)), [preview])
  const actionError = generate.error ?? upload.error ?? approve.error

  const resetActions = () => {
    generate.reset()
    upload.reset()
    approve.reset()
  }

  return (
    <Stack gap="lg">
      <Section
        level={1}
        eyebrow="Audio"
        title="Audio per text"
        description="Residents hear an approved human recording when there is one, otherwise generated audio. Changing a text makes its audio stale."
      >
        {assets.isPending ? (
          <LoadingState label="Loading audio" />
        ) : assets.isError ? (
          <ErrorState title="Could not load audio" message={adminErrorMessage(assets.error)} onRetry={() => assets.refetch()} retrying={assets.isFetching} />
        ) : (
          <AssetsTable
            rows={rows}
            onOpen={(row) => {
              resetActions()
              setOpenKey(row.key)
            }}
            onListen={listenUrl}
            listenState={listenState}
            toolbar={
              <AudioFilters
                languages={languages.data?.languages ?? NO_LANGUAGES}
                lang={lang}
                onLangChange={(next) => {
                  preview.stop()
                  setLang(next)
                }}
                show={show}
                onShowChange={setShow}
                search={search}
                onSearchChange={setSearch}
              />
            }
          />
        )}
      </Section>
      <AssetDrawer
        key={openKey ?? 'closed'}
        row={openRow}
        generatedNeedsReview={capability?.generatedAudioReview === 'unchecked'}
        onClose={() => {
          preview.stop()
          setOpenKey(null)
        }}
        onListen={listenUrl}
        listenState={listenState}
        onGenerate={() => openRow && generate.mutate({ key: openRow.key, lang })}
        generating={generate.isPending}
        onUpload={(file) => openRow && upload.mutate({ key: openRow.key, lang, file })}
        uploading={upload.isPending}
        onApprove={(assetId) => approve.mutate(assetId)}
        approving={approve.isPending}
        error={actionError ? adminErrorMessage(actionError) : null}
      />
    </Stack>
  )
}

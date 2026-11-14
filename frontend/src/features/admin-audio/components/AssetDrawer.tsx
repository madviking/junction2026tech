import { useState } from 'react'
import { ActionButton, AudioPlayButton, Banner, Divider, FileField, Row, Stack, Text, type AudioPlayState } from '@/shared/ui'
import { SideDrawer } from '@/shared/ui/admin'
import { AssetBadge, ServedBadge } from '@/features/admin-audio/components/AudioBadges'
import type { AudioAsset, AudioAssetRow } from '@/features/admin-audio/types'

function formatDate(iso: string | null) {
  if (!iso) return ''
  const at = new Date(iso)
  return Number.isNaN(at.getTime()) ? iso : at.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

function assetLine(asset: AudioAsset) {
  const made = `Created by ${asset.createdBy}, ${formatDate(asset.createdAt)}`
  return asset.approvedBy ? `${made}. Approved by ${asset.approvedBy}, ${formatDate(asset.approvedAt)}.` : `${made}.`
}

export interface AssetDrawerProps {
  row: AudioAssetRow | null
  /** Generated audio for this language must be reviewed (Somali): only a human recording can be approved. */
  generatedNeedsReview: boolean
  onClose: () => void
  onListen: (url: string) => void
  listenState: (url: string) => AudioPlayState
  onGenerate: () => void
  generating: boolean
  onUpload: (file: File) => void
  uploading: boolean
  onApprove: (assetId: number) => void
  approving: boolean
  error?: string | null
}

/** Audio for one text key: what is served, the human recording and the generated audio, and their actions. */
export function AssetDrawer(props: AssetDrawerProps) {
  const { row, generatedNeedsReview, onClose, onListen, listenState, onGenerate, generating, onUpload, uploading, onApprove, approving, error } = props
  const [file, setFile] = useState<File | null>(null)

  return (
    <SideDrawer
      opened={row !== null}
      onClose={onClose}
      title={row ? row.key : 'Audio'}
      footer={
        <ActionButton variant="secondary" compact onPress={onClose}>
          Close
        </ActionButton>
      }
    >
      {row && (
        <Stack gap="md">
          <Stack gap="xs">
            <Text variant="label">{`Current text (${row.lang})`}</Text>
            <Text>{row.text}</Text>
            <Row gap="xs">
              <Text variant="caption" tone="muted" as="span">
                Residents hear:
              </Text>
              <ServedBadge served={row.served} />
            </Row>
            <Text variant="caption" tone="muted">
              An approved human recording always wins over generated audio. Audio belongs to the exact text: when the text
              changes, older audio becomes stale and is never served.
              {row.staleAssets > 0 ? ` This text has ${row.staleAssets} stale ${row.staleAssets === 1 ? 'clip' : 'clips'} from earlier wording.` : ''}
            </Text>
          </Stack>
          {error && (
            <Banner tone="warning" title="Audio action failed">
              {error}
            </Banner>
          )}

          <Divider label="Human recording" />
          {row.human ? (
            <Stack gap="sm">
              <Row gap="sm">
                <AudioPlayButton state={listenState(row.human.url)} label="Listen to the human recording" onPress={() => row.human && onListen(row.human.url)} />
                <AssetBadge asset={row.human} />
                {row.human.review === 'unchecked' && (
                  <ActionButton compact loading={approving} onPress={() => row.human && onApprove(row.human.id)}>
                    Approve recording
                  </ActionButton>
                )}
              </Row>
              <Text variant="caption" tone="muted">
                {assetLine(row.human)}
              </Text>
            </Stack>
          ) : (
            <Text tone="muted">No human recording for this text yet.</Text>
          )}
          <FileField
            label={row.human ? 'Replace with a new recording' : 'Upload a recording'}
            description="WAV, MP3, WebM or Ogg, at most 5 MB. It stays unchecked until approved."
            value={file}
            onChange={setFile}
            accept="audio/*"
          />
          <Row>
            <ActionButton
              variant="secondary"
              compact
              disabled={!file}
              loading={uploading}
              onPress={() => {
                if (file) onUpload(file)
                setFile(null)
              }}
            >
              Upload recording
            </ActionButton>
          </Row>

          <Divider label="Generated audio" />
          {row.generated ? (
            <Stack gap="sm">
              <Row gap="sm">
                <AudioPlayButton state={listenState(row.generated.url)} label="Listen to the generated audio" onPress={() => row.generated && onListen(row.generated.url)} />
                <AssetBadge asset={row.generated} />
              </Row>
              <Text variant="caption" tone="muted">
                {assetLine(row.generated)}
              </Text>
            </Stack>
          ) : (
            <Stack gap="sm" align="start">
              <Text tone="muted">No generated audio for this text yet. It is also generated the first time a resident plays it.</Text>
              <ActionButton variant="secondary" compact loading={generating} onPress={onGenerate}>
                Generate audio (text-to-speech)
              </ActionButton>
            </Stack>
          )}
          {generatedNeedsReview && (
            <Text variant="caption" tone="muted">
              Generated audio in this language is not checked; residents get it as unchecked until a human recording is approved.
            </Text>
          )}
        </Stack>
      )}
    </SideDrawer>
  )
}

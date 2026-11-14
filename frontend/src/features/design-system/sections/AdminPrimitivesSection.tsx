import { IconFilter, IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import {
  ActionButton,
  CheckboxField,
  EmptyState,
  FileField,
  Grid,
  PasswordField,
  Row,
  Section,
  SelectField,
  Stack,
  StatusBadge,
  SurfaceCard,
  Text,
  TextAreaField,
  TextField,
} from '@/shared/ui'
import {
  DataTable,
  SideDrawer,
  Tabs,
  Toolbar,
  type DataTableColumn,
  type TabItem,
} from '@/shared/ui/admin'
import { noop } from '@/features/design-system/sections/noop'
import { Specimen } from '@/features/design-system/sections/Specimen'

const NO_ROWS: PhraseRow[] = []

interface PhraseRow {
  id: string
  phrase: string
  language: string
  status: 'approved' | 'review' | 'missing'
  plays: number
}

const phraseRows: PhraseRow[] = [
  { id: '1', phrase: 'I noticed a lump', language: 'Arabic', status: 'approved', plays: 412 },
  { id: '2', phrase: 'Since when?', language: 'Somali', status: 'review', plays: 87 },
  { id: '3', phrase: 'Does it hurt?', language: 'Dari', status: 'missing', plays: 0 },
]

const STATUS_TONE = { approved: 'success', review: 'warning', missing: 'danger' } as const

const phraseColumns: DataTableColumn<PhraseRow>[] = [
  { key: 'phrase', header: 'Phrase', render: (row) => row.phrase },
  { key: 'language', header: 'Language', render: (row) => row.language },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge tone={STATUS_TONE[row.status]}>{row.status}</StatusBadge> },
  { key: 'plays', header: 'Plays', numeric: true, render: (row) => row.plays },
]

const languageOptions = [
  { value: 'all', label: 'All languages' },
  { value: 'Arabic', label: 'Arabic' },
  { value: 'Somali', label: 'Somali' },
  { value: 'Dari', label: 'Dari' },
]

const adminTabs: TabItem[] = [
  { value: 'phrases', label: 'Phrases' },
  { value: 'audio', label: 'Audio' },
  { value: 'settings', label: 'Settings' },
]


function PhraseTableDemo() {
  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState<string | null>('all')
  const rows = phraseRows.filter(
    (row) =>
      row.phrase.toLowerCase().includes(query.toLowerCase()) && (language === 'all' || row.language === language),
  )
  return (
    <DataTable
      label="Phrases"
      columns={phraseColumns}
      rows={rows}
      rowKey={(row) => row.id}
      onRowClick={noop}
      emptyState={<EmptyState title="No phrases match" description="Clear the search or pick another language." />}
      toolbar={
        <Toolbar actions={<ActionButton compact icon={<IconPlus size={18} />}>Add phrase</ActionButton>}>
          <TextField label="Search" type="search" value={query} onChange={setQuery} placeholder="Type to filter" />
          <SelectField label="Language" options={languageOptions} value={language} onChange={setLanguage} />
        </Toolbar>
      }
    />
  )
}

export function AdminPrimitivesSection() {
  const [tab, setTab] = useState('phrases')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [consent, setConsent] = useState(true)
  return (
    <Section
      eyebrow="Admin"
      title="Admin primitives"
      description="Desktop-first, usable at 768px. AdminShell is shown live at /admin."
    >
      <Stack gap="md">
        <Tabs label="Content sections" items={adminTabs} value={tab} onChange={setTab}>
          <SurfaceCard>
            <Text>Active tab: {tab}</Text>
          </SurfaceCard>
        </Tabs>
      </Stack>

      <Specimen title="DataTable with Toolbar">
        <PhraseTableDemo />
      </Specimen>

      <Specimen title="DataTable empty">
        <DataTable
          label="Empty phrases"
          columns={phraseColumns}
          rows={NO_ROWS}
          rowKey={(row) => row.id}
          emptyState={<EmptyState title="No phrases yet" description="Add the first phrase." />}
          toolbar={<Toolbar actions={<ActionButton compact icon={<IconFilter size={18} />} variant="secondary">Filters</ActionButton>} />}
        />
      </Specimen>

      <Specimen title="Form fields">
        <Grid min="md">
          <TextField label="Phrase" description="As the resident hears it." placeholder="I noticed a lump" />
          <TextField label="With error" value="" error="Phrase is required" required />
          <TextField label="Disabled" value="Locked" disabled />
          <PasswordField label="Password" autoComplete="current-password" />
          <SelectField label="Language" options={languageOptions} placeholder="Pick one" />
          <FileField label="Audio file" description="MP3 or WAV, under 1 MB." placeholder="Choose audio" />
        </Grid>
        <TextAreaField label="Clinician note" description="Shown on the visit card." />
        <CheckboxField
          label="Reviewed by a native speaker"
          description="Removes the unchecked-translation marker."
          checked={consent}
          onChange={setConsent}
        />
        <CheckboxField label="Checkbox with error" error="Confirm before publishing" />
      </Specimen>

      <Grid min="md">
        <Specimen title="StatusBadge">
          <Row>
            <StatusBadge tone="neutral">draft</StatusBadge>
            <StatusBadge tone="info">info</StatusBadge>
            <StatusBadge tone="success">approved</StatusBadge>
            <StatusBadge tone="warning">in review</StatusBadge>
            <StatusBadge tone="danger">missing</StatusBadge>
          </Row>
        </Specimen>
        <Specimen title="SideDrawer">
          <Row>
            <ActionButton variant="secondary" onPress={() => setDrawerOpen(true)}>
              Open drawer
            </ActionButton>
          </Row>
          <SideDrawer
            opened={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            title="Edit phrase"
            footer={
              <>
                <ActionButton variant="subtle" compact onPress={() => setDrawerOpen(false)}>
                  Cancel
                </ActionButton>
                <ActionButton compact onPress={() => setDrawerOpen(false)}>
                  Save
                </ActionButton>
              </>
            }
          >
            <Stack>
              <TextField label="Phrase" value="I noticed a lump" />
              <FileField label="Audio file" />
            </Stack>
          </SideDrawer>
        </Specimen>
      </Grid>
    </Section>
  )
}

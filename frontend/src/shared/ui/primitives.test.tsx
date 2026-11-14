import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  ActionButton,
  AudioPlayButton,
  BodyMap,
  type BodyRegionId,
  ChoiceCard,
  EmptyState,
  ErrorState,
  formatElapsed,
  RecordButton,
  StepList,
} from '@/shared/ui'
import { DataTable } from '@/shared/ui/admin'
import { renderWithProviders } from '@/test/render'

describe('UiProvider', () => {
  it('keeps <html dir lang> in sync with its props', () => {
    renderWithProviders(<p>مرحبا</p>, { dir: 'rtl', lang: 'ar' })
    expect(document.documentElement.dir).toBe('rtl')
    expect(document.documentElement.lang).toBe('ar')
  })
})

describe('ChoiceCard', () => {
  it('is a toggle button named by its label and described by its detail', async () => {
    const onPress = vi.fn()
    renderWithProviders(<ChoiceCard label="Suomi" detail="Finnish" selected={false} onPress={onPress} />)

    const button = screen.getByRole('button', { name: 'Suomi' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).toHaveAccessibleDescription('Finnish')
    await userEvent.click(button)
    expect(onPress).toHaveBeenCalledOnce()
  })

  it('keeps the trailing control outside the main button', () => {
    renderWithProviders(
      <ChoiceCard label="Lump" selected trailing={<AudioPlayButton state="idle" label="Listen" onPress={() => {}} />} />,
    )
    expect(screen.getByRole('button', { name: 'Lump' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Listen' })).not.toBeDisabled()
  })

  it('cannot be pressed when disabled', () => {
    renderWithProviders(<ChoiceCard label="Later" disabled onPress={() => {}} />)
    expect(screen.getByRole('button', { name: 'Later' })).toBeDisabled()
  })
})

describe('BodyMap', () => {
  const regions = [
    { id: 'head' as const, label: 'Head and neck' },
    { id: 'chest' as const, label: 'Chest' },
  ]

  it('is a named group of region toggles; pressing the chosen one clears it', async () => {
    const onChange = vi.fn()
    function Harness() {
      const [value, setValue] = useState<BodyRegionId | null>(null)
      const change = (next: BodyRegionId | null) => {
        onChange(next)
        setValue(next)
      }
      return <BodyMap label="Where?" regions={regions} value={value} onChange={change} />
    }
    renderWithProviders(<Harness />)

    const chest = within(screen.getByRole('group', { name: 'Where?' })).getByRole('button', { name: 'Chest' })
    expect(chest).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(chest)
    expect(onChange).toHaveBeenLastCalledWith('chest')
    expect(chest).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(chest)
    expect(onChange).toHaveBeenLastCalledWith(null)
    expect(chest).toHaveAttribute('aria-pressed', 'false')
  })

  it('offers only the given regions and cannot be pressed when disabled', () => {
    renderWithProviders(<BodyMap label="Where?" regions={regions} value={null} onChange={() => {}} disabled />)
    expect(screen.queryByRole('button', { name: 'Skin' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Head and neck' })).toBeDisabled()
  })
})

describe('ChoiceCard tile layout', () => {
  it('keeps the same toggle semantics as the row layout', async () => {
    const onPress = vi.fn()
    renderWithProviders(<ChoiceCard layout="tile" label="A new lump" icon={<span />} selected={false} onPress={onPress} />)
    const button = screen.getByRole('button', { name: 'A new lump' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(button)
    expect(onPress).toHaveBeenCalledOnce()
  })
})

describe('ActionButton', () => {
  it('fires onPress', async () => {
    const onPress = vi.fn()
    renderWithProviders(<ActionButton onPress={onPress}>Continue</ActionButton>)
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(onPress).toHaveBeenCalledOnce()
  })

  it('blocks presses while loading', () => {
    renderWithProviders(
      <ActionButton loading onPress={() => {}}>
        Continue
      </ActionButton>,
    )
    expect(screen.getByRole('button', { name: /Continue/ })).toBeDisabled()
  })

  it('an external link opens a new tab without triggering a clickable parent', async () => {
    const onRow = vi.fn()
    renderWithProviders(
      <div role="presentation" onClick={onRow}>
        <ActionButton href="https://example.test/page" external>
          Source
        </ActionButton>
      </div>,
    )
    const link = screen.getByRole('link', { name: 'Source' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    link.addEventListener('click', (e) => e.preventDefault())
    await userEvent.click(link)
    expect(onRow).not.toHaveBeenCalled()
  })
})

describe('RecordButton', () => {
  it('announces the recording state and shows elapsed time', () => {
    renderWithProviders(<RecordButton state="recording" label="Stop recording" elapsedSeconds={75} onPress={() => {}} />)
    expect(screen.getByRole('button', { name: 'Stop recording' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('1:15')).toBeInTheDocument()
  })

  it('is disabled while processing', () => {
    renderWithProviders(<RecordButton state="processing" label="Processing" onPress={() => {}} />)
    expect(screen.getByRole('button', { name: 'Processing' })).toBeDisabled()
  })

  it('formats elapsed seconds as m:ss', () => {
    expect(formatElapsed(0)).toBe('0:00')
    expect(formatElapsed(9.8)).toBe('0:09')
    expect(formatElapsed(600)).toBe('10:00')
  })
})

describe('StepList', () => {
  it('marks the current step for assistive tech', () => {
    renderWithProviders(
      <StepList
        steps={[
          { id: 'a', title: 'Describe', status: 'done' },
          { id: 'b', title: 'Choose clinic', status: 'current' },
        ]}
      />,
    )
    expect(screen.getByText('Choose clinic').closest('li')).toHaveAttribute('aria-current', 'step')
  })
})

describe('DataTable', () => {
  const columns = [{ key: 'name', header: 'Name', render: (row: { name: string }) => row.name }]

  it('shows the empty state when there are no rows', () => {
    renderWithProviders(
      <DataTable label="Phrases" columns={columns} rows={[]} rowKey={(r) => r.name} emptyState={<EmptyState title="No phrases" />} />,
    )
    expect(screen.getByText('No phrases')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('activates a row with the keyboard', async () => {
    const onRowClick = vi.fn()
    renderWithProviders(
      <DataTable
        label="Phrases"
        columns={columns}
        rows={[{ name: 'Lump' }]}
        rowKey={(r) => r.name}
        emptyState={null}
        onRowClick={onRowClick}
      />,
    )
    screen.getByRole('row', { name: 'Lump' }).focus()
    await userEvent.keyboard('{Enter}')
    expect(onRowClick).toHaveBeenCalledWith({ name: 'Lump' })
  })
})

describe('ErrorState', () => {
  it('says what failed and offers a retry', async () => {
    const onRetry = vi.fn()
    renderWithProviders(<ErrorState title="Could not load" message="Try again." onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load')
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})

import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DesignSystemPage } from '@/features/design-system'
import { renderWithProviders } from '@/test/render'

describe('DesignSystemPage', () => {
  it('renders the tokens and every primitive section', () => {
    renderWithProviders(<DesignSystemPage />, { route: '/design-system' })

    expect(screen.getByRole('heading', { level: 1, name: 'Design system' })).toBeInTheDocument()
    // One role query over the large page, not one per section: each getByRole walks the
    // whole DOM, and 25 of them made this the slowest test in the suite.
    const headings = new Set(screen.getAllByRole('heading').map((h) => h.textContent?.trim()))
    for (const name of [
      'Semantic colours',
      'Palettes',
      'Contrast (WCAG 2.2 AA)',
      'Type scale',
      'Spacing',
      'Radius',
      'ActionButton',
      'ChoiceCard',
      'BodyMap and ChoiceCard layout=tile (picture symptom picker)',
      'AudioPlayButton',
      'PhotoButton',
      'RecordButton',
      'Banner',
      'StepList',
      'StatTile',
      'LoadingState',
      'EmptyState',
      'ErrorState',
      'PageShell',
      'DataTable with Toolbar',
      'Form fields',
      'StatusBadge',
      'SideDrawer',
      'IconButton',
      'RTL sample',
    ]) {
      expect(headings, name).toContain(name)
    }
    expect(screen.queryByText(/FAIL/)).not.toBeInTheDocument()
  })

  it('renders the Arabic sample right-to-left', () => {
    renderWithProviders(<DesignSystemPage />)
    const choice = screen.getByRole('button', { name: 'لاحظت كتلة' })
    expect(choice.closest('[dir="rtl"]')).toHaveAttribute('lang', 'ar')
  })

  it('filters the phrase table and shows its empty state', async () => {
    renderWithProviders(<DesignSystemPage />)
    const table = screen.getByRole('table', { name: 'Phrases' })
    expect(within(table).getByText('Since when?')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'zzz')
    expect(screen.getByText('No phrases match')).toBeInTheDocument()
  })
})

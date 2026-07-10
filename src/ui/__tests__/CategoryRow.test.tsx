// ABOUTME: Tests the expandable category row: trailing state, reveal, and empty state.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CategoryRow } from '../CategoryRow'
import type { DashboardRow } from '../dashboardRows'

const row = (over: Partial<DashboardRow>): DashboardRow => ({
  key: 'ethics', label: 'Legal Ethics', met: true, remaining: 0, earned: 4, required: 4,
  children: [], credits: [], ...over,
})

describe('CategoryRow', () => {
  it('shows a check and value when met', () => {
    render(<CategoryRow row={row({})} onOpenCredit={() => {}} />)
    expect(screen.getByText('4/4')).toBeInTheDocument()
  })

  it('shows the remaining amount when unmet', () => {
    render(<CategoryRow row={row({ key: 'civility', label: 'Civility', met: false, remaining: 1, earned: 0, required: 1 })} onOpenCredit={() => {}} />)
    expect(screen.getByText('+1 hr')).toBeInTheDocument()
  })

  it('expands to reveal contributing credits and opens one', () => {
    const onOpen = vi.fn()
    const credits = [{ id: 'a', provider: 'CEB', activityTitle: 'Ethics', completionDate: '2026-01-22', totalHours: 2, participatory: true, categoryHours: { ethics: 2 } }]
    render(<CategoryRow row={row({ credits })} onOpenCredit={onOpen} />)
    fireEvent.click(screen.getByText('Legal Ethics'))
    fireEvent.click(screen.getByText('Ethics'))
    expect(onOpen).toHaveBeenCalledWith('a')
  })

  it('shows a per-category empty state when no credits contribute', () => {
    render(<CategoryRow row={row({ key: 'civility', label: 'Civility', met: false, remaining: 1, earned: 0, required: 1, credits: [] })} onOpenCredit={() => {}} />)
    fireEvent.click(screen.getByText('Civility'))
    expect(screen.getByText(/no civility cle/i)).toBeInTheDocument()
  })
})

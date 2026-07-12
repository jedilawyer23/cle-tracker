// ABOUTME: Tests the unified requirement bar row — aligned earned/required/check columns, the
// ABOUTME: expandable accordion for category rows, and that flat rows render no expand control.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BarRow } from '../BarRow'
import type { DashboardRow } from '../dashboardRows'

const row = (over: Partial<DashboardRow>): DashboardRow => ({
  key: 'ethics', label: 'Legal Ethics', met: true, remaining: 0, earned: 4, required: 4,
  children: [], credits: [], ...over,
})

describe('BarRow', () => {
  it('shows aligned earned/required values and a check when met', () => {
    render(<BarRow row={row({})} expandable onOpenCredit={() => {}} />)
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('/ 4')).toBeInTheDocument()
    expect(document.querySelector('.chkcol .ck')).toBeInTheDocument()
  })

  // A floating-point sum of logged hours (e.g. 1.2 + 2.2) must round for display, not render
  // as "3.4000000000000004".
  it('rounds a floating-point earned value to at most 1 decimal', () => {
    render(<BarRow row={row({ earned: 3.4000000000000004, required: 4 })} expandable onOpenCredit={() => {}} />)
    expect(screen.getByText('3.4')).toBeInTheDocument()
    expect(screen.queryByText('3.4000000000000004')).not.toBeInTheDocument()
  })

  it('rounds a floating-point remaining value in the gap hint to at most 1 decimal', () => {
    const credits = [{ id: 'a', provider: 'p', activityTitle: 't', completionDate: '2026-01-01', totalHours: 1.2, participatory: true, categoryHours: { civility: 1.2 } }]
    render(<BarRow row={row({
      key: 'civility', label: 'Civility', met: false,
      earned: 1.2, required: 3.6000000000000005, remaining: 2.4000000000000004, credits,
    })} expandable onOpenCredit={() => {}} />)
    fireEvent.click(screen.getByText('Civility'))
    expect(screen.getByText('Still need 2.4 hrs.')).toBeInTheDocument()
  })

  it('shows no check when unmet, and gives a zero-progress row an orange tick fill', () => {
    render(<BarRow row={row({ key: 'civility', label: 'Civility', met: false, remaining: 1, earned: 0, required: 1 })} expandable onOpenCredit={() => {}} />)
    expect(document.querySelector('.chkcol .ck')).not.toBeInTheDocument()
    const fill = document.querySelector('.pbar > i')!
    expect(fill).toHaveClass('o')
  })

  it('gives a partially-progressed unmet row a blue (accent) fill', () => {
    render(<BarRow row={row({ key: 'competence', label: 'Competence', met: false, remaining: 1, earned: 1, required: 2 })} expandable onOpenCredit={() => {}} />)
    const fill = document.querySelector('.pbar > i')!
    expect(fill).toHaveClass('a')
  })

  it('gives a met row a green fill', () => {
    render(<BarRow row={row({})} expandable onOpenCredit={() => {}} />)
    const fill = document.querySelector('.pbar > i')!
    expect(fill).toHaveClass('g')
  })

  it('is expandable: shows a chevron, expands to reveal contributing credits, and opens one', () => {
    const onOpen = vi.fn()
    const credits = [{ id: 'a', provider: 'CEB', activityTitle: 'Ethics', completionDate: '2026-01-22', totalHours: 2, participatory: true, categoryHours: { ethics: 2 } }]
    render(<BarRow row={row({ credits })} expandable onOpenCredit={onOpen} />)
    expect(document.querySelector('.chev')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Legal Ethics'))
    fireEvent.click(screen.getByText('Ethics'))
    expect(onOpen).toHaveBeenCalledWith('a')
  })

  it('is keyboard-focusable and toggles open on Enter, reflecting state via aria-expanded', () => {
    render(<BarRow row={row({})} expandable onOpenCredit={() => {}} />)
    const rowbar = document.querySelector('.rowbar.tap')!
    expect(rowbar).toHaveAttribute('role', 'button')
    expect(rowbar).toHaveAttribute('tabIndex', '0')
    expect(rowbar).toHaveAttribute('aria-expanded', 'false')

    fireEvent.keyDown(rowbar, { key: 'Enter' })
    expect(rowbar).toHaveAttribute('aria-expanded', 'true')
    expect(rowbar.closest('.item')).toHaveClass('open')
  })

  it('toggles open on Space too', () => {
    render(<BarRow row={row({})} expandable onOpenCredit={() => {}} />)
    const rowbar = document.querySelector('.rowbar.tap')!
    fireEvent.keyDown(rowbar, { key: ' ' })
    expect(rowbar).toHaveAttribute('aria-expanded', 'true')
  })

  it('lets a credit row inside the accordion be opened via the keyboard', () => {
    const onOpen = vi.fn()
    const credits = [{ id: 'a', provider: 'CEB', activityTitle: 'Ethics', completionDate: '2026-01-22', totalHours: 2, participatory: true, categoryHours: { ethics: 2 } }]
    render(<BarRow row={row({ credits })} expandable onOpenCredit={onOpen} />)
    fireEvent.click(screen.getByText('Legal Ethics'))
    const crow = document.querySelector('.crow')!
    expect(crow).toHaveAttribute('role', 'button')
    expect(crow).toHaveAttribute('tabIndex', '0')
    fireEvent.keyDown(crow, { key: 'Enter' })
    expect(onOpen).toHaveBeenCalledWith('a')
  })

  it('renders a flat (non-expandable) row with no chevron, no credits panel, and no tap target', () => {
    const { container } = render(<BarRow row={row({ key: 'total', label: 'Total hours' })} expandable={false} onOpenCredit={() => {}} />)
    expect(container.querySelector('.chev')).not.toBeInTheDocument()
    expect(container.querySelector('.credits')).not.toBeInTheDocument()
    expect(container.querySelector('.rowbar.tap')).not.toBeInTheDocument()
  })

  it('shows a per-category empty state when no credits contribute', () => {
    render(<BarRow row={row({ key: 'civility', label: 'Civility', met: false, remaining: 1, earned: 0, required: 1, credits: [] })} expandable onOpenCredit={() => {}} />)
    fireEvent.click(screen.getByText('Civility'))
    expect(screen.getByText(/no civility cle/i)).toBeInTheDocument()
  })

  it('shows the sub-minimum meta text even when the parent row is met', () => {
    render(<BarRow row={row({
      key: 'bias', label: 'Elimination of Bias', met: true, remaining: 0, earned: 2, required: 2,
      children: [{ key: 'biasImplicit', label: 'Implicit Bias', required: 1, earned: 1, remaining: 0, met: true, parent: 'bias' }],
    })} expandable onOpenCredit={() => {}} />)
    expect(screen.getByText('incl. 1 hr Implicit Bias')).toBeInTheDocument()
  })

  it('shows the participatory meta hint', () => {
    render(<BarRow row={row({ key: 'participatory', label: 'Participatory', met: false, remaining: 3.5, earned: 9, required: 12.5 })} expandable={false} onOpenCredit={() => {}} />)
    expect(screen.getByText('live hours, not self-study')).toBeInTheDocument()
  })

  // mockups.html #s-dash: Competence expanded shows the counted credit AND the
  // "Still need 1 hr, including Prevention & Detection." hint — the hint must persist
  // once a credit exists, not disappear the moment the row is no longer empty.
  it('keeps the sub-minimum gap hint visible once a credit has been added', () => {
    const credits = [{ id: 'a', provider: 'State Bar of CA', activityTitle: 'Attorney Wellness & Competence', completionDate: '2025-10-02', totalHours: 1, participatory: true, categoryHours: { competence: 1 } }]
    const competenceRow = row({
      key: 'competence', label: 'Competence', met: false, remaining: 1, earned: 1, required: 2,
      children: [{ key: 'competencePrevention', label: 'Prevention & Detection', required: 1, earned: 0, remaining: 1, met: false, parent: 'competence' }],
      credits,
    })
    render(<BarRow row={competenceRow} expandable onOpenCredit={() => {}} />)
    fireEvent.click(screen.getByText('Competence'))
    expect(screen.getByText('Attorney Wellness & Competence')).toBeInTheDocument()
    expect(screen.getByText('Still need 1 hr, including Prevention & Detection.')).toBeInTheDocument()
  })
})

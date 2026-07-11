// ABOUTME: Verifies the Dashboard renders the unified requirements bar-row list (populated and
// ABOUTME: empty), the deadline/cycle sub-lines, and that only category rows expand.
import { render, screen, fireEvent } from '@testing-library/react'
import { Dashboard } from '../Dashboard'
import { calculateCompliance } from '../../domain/complianceCalculator'
import { REQUIREMENT_RULES } from '../../domain/requirements'
import type { Credit } from '../../domain/types'

const PERIOD = { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }
const TOP_LEVEL_LABELS = [
  'Total hours', 'Legal Ethics', 'Competence', 'Elimination of Bias',
  'Technology', 'Civility', 'Participatory',
]

it('shows the empty requirement list with the deadline', () => {
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  render(<Dashboard name="Maya Hoffman" group={2} period={PERIOD}
    result={result} credits={[]} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.getByText('Legal Ethics')).toBeInTheDocument()
  expect(screen.getByText(/Mar 30, 2027|2027-03-30/)).toBeInTheDocument()
})

it('shows the reporting cycle window on the empty dashboard', () => {
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  render(<Dashboard name="Maya Hoffman" group={2} period={PERIOD}
    result={result} credits={[]} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.getByText(/Reporting cycle:.*Feb 1, 2024.*Mar 29, 2027/)).toBeInTheDocument()
  expect(screen.getByText(/hours required.*report by.*Mar 30, 2027/)).toBeInTheDocument()
})

it('shows the reporting cycle window on the populated dashboard', () => {
  const credits: Credit[] = [{
    id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22',
    totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
  }]
  const result = calculateCompliance(REQUIREMENT_RULES, credits)
  render(<Dashboard name="Maya Hoffman" group={2} period={PERIOD}
    result={result} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.getByText(/Reporting cycle:.*Feb 1, 2024.*Mar 29, 2027/)).toBeInTheDocument()
  expect(screen.getByText(/Report by.*Mar 30, 2027.*days left.*4 of 25 hours logged/)).toBeInTheDocument()
})

it('shows the clekeeper wordmark on both the empty and populated dashboards', () => {
  const credits: Credit[] = [{
    id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22',
    totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
  }]
  for (const list of [[], credits]) {
    const result = calculateCompliance(REQUIREMENT_RULES, list)
    const { unmount } = render(<Dashboard name="Maya Hoffman" group={2} period={PERIOD}
      result={result} credits={list} today="2026-07-10"
      accountState="guest" onSignIn={() => {}}
      onAddCredit={() => {}} onOpenCredit={() => {}} />)
    expect(document.querySelector('.topline .brand')).toHaveTextContent('clekeeper')
    unmount()
  }
})

it('renders the sign-in affordance as the first child inside the content wrap', () => {
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  const { container } = render(<Dashboard name="Maya Hoffman" group={2} period={PERIOD}
    result={result} credits={[]} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  const wrap = container.querySelector('.wrap')!
  expect(wrap.firstElementChild).toHaveClass('topline')
  expect(wrap.querySelector('.topline .navbtn')).toHaveTextContent(/sign in to save/i)
})

it('renders the signInMessage note inside the wrap, under the topline', () => {
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  render(<Dashboard name="Maya Hoffman" group={2} period={PERIOD}
    result={result} credits={[]} today="2026-07-10"
    accountState="guest" onSignIn={() => {}} signInMessage="Saved to your Google account."
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.getByText('Saved to your Google account.')).toBeInTheDocument()
})

it('shows a single unified requirements list (no Still-needed/Complete split) with all 7 top-level labels and their earned/required values', () => {
  const credits: Credit[] = [{
    id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22',
    totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
  }]
  const result = calculateCompliance(REQUIREMENT_RULES, credits)
  const { container } = render(<Dashboard name="Maya Hoffman" group={2} period={PERIOD}
    result={result} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.getByText(/requirements left/i)).toBeInTheDocument()
  expect(screen.queryByText('Still needed')).not.toBeInTheDocument()
  expect(screen.queryByText('Complete')).not.toBeInTheDocument()
  const list = container.querySelector('.list')!
  for (const label of TOP_LEVEL_LABELS) {
    expect(list.querySelector(`.rowbar`)).toBeInTheDocument()
    expect(screen.getByText(label)).toBeInTheDocument()
  }
  expect(list.querySelectorAll(':scope > .item')).toHaveLength(7)
  // Legal Ethics is met (4/4) — its row shows a check.
  const ethicsRow = screen.getByText('Legal Ethics').closest('.item')!
  expect(ethicsRow.querySelector('.chkcol .ck')).toBeInTheDocument()
  // Civility is untouched (0/1) — no check.
  const civilityRow = screen.getByText('Civility').closest('.item')!
  expect(civilityRow.querySelector('.chkcol .ck')).not.toBeInTheDocument()
})

it('shows the unified list on the empty dashboard too, with all bars unmet', () => {
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  const { container } = render(<Dashboard name="Maya Hoffman" group={2} period={PERIOD}
    result={result} credits={[]} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  const list = container.querySelector('.list')!
  expect(list.querySelectorAll(':scope > .item')).toHaveLength(7)
  expect(list.querySelectorAll('.chkcol .ck')).toHaveLength(0)
  for (const label of TOP_LEVEL_LABELS) {
    expect(screen.getByText(label)).toBeInTheDocument()
  }
})

// Carry-forward (M1 review, item 1): the headline count must equal the number of unmet
// top-level rows, and a met parent (Competence 2/2) with an unmet sub-minimum
// (Prevention & Detection 0/1) must count as unmet.
it('counts a parent with an unmet sub-minimum as unmet in the headline "N requirements left"', () => {
  const credits: Credit[] = [
    { id: 'ethics', provider: 'p', activityTitle: 'Ethics Course', completionDate: '2026-01-01', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } },
    { id: 'competence', provider: 'p', activityTitle: 'Competence Course', completionDate: '2026-01-01', totalHours: 2, participatory: true, categoryHours: { competence: 2 } },
    { id: 'bias', provider: 'p', activityTitle: 'Bias Course', completionDate: '2026-01-01', totalHours: 2, participatory: true, categoryHours: { bias: 2, biasImplicit: 1 } },
    { id: 'tech', provider: 'p', activityTitle: 'Tech Course', completionDate: '2026-01-01', totalHours: 1, participatory: true, categoryHours: { technology: 1 } },
  ]
  const result = calculateCompliance(REQUIREMENT_RULES, credits)
  const { container } = render(<Dashboard name="Maya Hoffman" group={2} period={PERIOD}
    result={result} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)

  // 4 unmet top-level rows: total, competence, civility, participatory.
  expect(screen.getByText('4 requirements left')).toBeInTheDocument()
  const list = container.querySelector('.list')!
  expect(list.querySelectorAll(':scope > .item')).toHaveLength(7)
  const competenceRow = screen.getByText('Competence').closest('.item')!
  expect(competenceRow.querySelector('.chkcol .ck')).not.toBeInTheDocument()
})

it('lets a category row expand to its contributing credits, and does not expand Total hours or Participatory', () => {
  const credits: Credit[] = [{
    id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22',
    totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
  }]
  const result = calculateCompliance(REQUIREMENT_RULES, credits)
  render(<Dashboard name="Maya Hoffman" group={2} period={PERIOD}
    result={result} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)

  const ethicsRow = screen.getByText('Legal Ethics').closest('.item')!
  fireEvent.click(ethicsRow.querySelector('.rowbar')!)
  expect(ethicsRow.querySelector('.crow')).toBeInTheDocument()
  expect(screen.getByText('Conflicts of Interest')).toBeInTheDocument()

  const totalRow = screen.getByText('Total hours').closest('.item')!
  const participatoryRow = screen.getByText('Participatory').closest('.item')!
  for (const item of [totalRow, participatoryRow]) {
    expect(item.querySelector('.chev')).not.toBeInTheDocument()
    expect(item.querySelector('.credits')).not.toBeInTheDocument()
    expect(item.querySelector('.rowbar.tap')).not.toBeInTheDocument()
  }
})

it('hides the Past cycles link by default on both the empty and populated dashboard', () => {
  const emptyResult = calculateCompliance(REQUIREMENT_RULES, [])
  const { rerender } = render(<Dashboard name="Maya Hoffman" group={2} period={PERIOD}
    result={emptyResult} credits={[]} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.queryByText(/past cycles/i)).not.toBeInTheDocument()

  const credits: Credit[] = [{
    id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22',
    totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
  }]
  const populatedResult = calculateCompliance(REQUIREMENT_RULES, credits)
  rerender(<Dashboard name="Maya Hoffman" group={2} period={PERIOD}
    result={populatedResult} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.queryByText(/past cycles/i)).not.toBeInTheDocument()
})

it('shows the Past cycles link on the empty dashboard when hasPastCycles is true, and calls onOpenPastCycles', () => {
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  const onOpenPastCycles = vi.fn()
  render(<Dashboard name="Maya Hoffman" group={2} period={PERIOD}
    result={result} credits={[]} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}}
    hasPastCycles onOpenPastCycles={onOpenPastCycles} />)
  const link = screen.getByText(/past cycles/i)
  fireEvent.click(link)
  expect(onOpenPastCycles).toHaveBeenCalled()
})

it('shows the Past cycles link on the populated dashboard when hasPastCycles is true', () => {
  const credits: Credit[] = [{
    id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22',
    totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
  }]
  const result = calculateCompliance(REQUIREMENT_RULES, credits)
  const onOpenPastCycles = vi.fn()
  render(<Dashboard name="Maya Hoffman" group={2} period={PERIOD}
    result={result} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}}
    hasPastCycles onOpenPastCycles={onOpenPastCycles} />)
  const link = screen.getByText(/past cycles/i)
  fireEvent.click(link)
  expect(onOpenPastCycles).toHaveBeenCalled()
})

it('threads name and photoURL to the signed-in header', () => {
  render(<Dashboard name="Maya Hoffman" photoURL="https://example.com/p.jpg" group={2} period={PERIOD}
    result={calculateCompliance(REQUIREMENT_RULES, [])} credits={[]} today="2026-07-10"
    accountState="linked" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.getByText('Maya Hoffman')).toBeInTheDocument()
  expect(document.querySelector('img.avatar')).toHaveAttribute('src', 'https://example.com/p.jpg')
})

it('forwards onSettings to the signed-in header on both the empty and populated dashboards', () => {
  const onSettings = vi.fn()
  const credits: Credit[] = [{
    id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22',
    totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
  }]
  for (const list of [[], credits]) {
    const result = calculateCompliance(REQUIREMENT_RULES, list)
    const { unmount } = render(<Dashboard name="Maya Hoffman" group={2} period={PERIOD}
      result={result} credits={list} today="2026-07-10"
      accountState="guest" onSignIn={() => {}} onSettings={onSettings}
      onAddCredit={() => {}} onOpenCredit={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /settings/i }))
    unmount()
  }
  expect(onSettings).toHaveBeenCalledTimes(2)
})

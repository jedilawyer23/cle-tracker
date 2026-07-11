// ABOUTME: Verifies the Dashboard renders derived requirement rows and the deadline, and the
// ABOUTME: populated Still-needed/Complete lists once credits exist.
import { render, screen, fireEvent } from '@testing-library/react'
import { Dashboard } from '../Dashboard'
import { calculateCompliance } from '../../domain/complianceCalculator'
import { REQUIREMENT_RULES } from '../../domain/requirements'
import type { Credit } from '../../domain/types'

it('shows the empty requirement with the deadline', () => {
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  render(<Dashboard name="Maya Hoffman" group={2}
    period={{ start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }}
    result={result} credits={[]} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.getByText('Legal Ethics')).toBeInTheDocument()
  expect(screen.getByText(/Mar 30, 2027|2027-03-30/)).toBeInTheDocument()
  expect(screen.getByText(/0 \/ 25|0\/25/)).toBeInTheDocument()
})

it('shows the reporting cycle window on the empty dashboard', () => {
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  render(<Dashboard name="Maya Hoffman" group={2}
    period={{ start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }}
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
  render(<Dashboard name="Maya Hoffman" group={2}
    period={{ start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }}
    result={result} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.getByText(/Reporting cycle:.*Feb 1, 2024.*Mar 29, 2027/)).toBeInTheDocument()
  expect(screen.getByText(/Report by.*Mar 30, 2027.*days left.*4 of 25 hours logged/)).toBeInTheDocument()
})

it('renders the sign-in affordance as the first child inside the content wrap', () => {
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  const { container } = render(<Dashboard name="Maya Hoffman" group={2}
    period={{ start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }}
    result={result} credits={[]} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  const wrap = container.querySelector('.wrap')!
  expect(wrap.firstElementChild).toHaveClass('topline')
  expect(wrap.querySelector('.topline .navbtn')).toHaveTextContent(/sign in to save/i)
})

it('renders the signInMessage note inside the wrap, under the topline', () => {
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  render(<Dashboard name="Maya Hoffman" group={2}
    period={{ start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }}
    result={result} credits={[]} today="2026-07-10"
    accountState="guest" onSignIn={() => {}} signInMessage="Saved to your Google account."
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.getByText('Saved to your Google account.')).toBeInTheDocument()
})

it('shows the binding constraint and grouped lists when credits exist', () => {
  const credits: Credit[] = [{
    id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22',
    totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
  }]
  const result = calculateCompliance(REQUIREMENT_RULES, credits)
  render(<Dashboard name="Maya Hoffman" group={2}
    period={{ start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }}
    result={result} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.getByText(/requirements left/i)).toBeInTheDocument()
  expect(screen.getByText('Still needed')).toBeInTheDocument()
  expect(screen.getByText('Complete')).toBeInTheDocument()
  expect(screen.getByText('Legal Ethics')).toBeInTheDocument()
})

// Carry-forward (M1 review, item 1): the headline count must equal the visible top-level
// Still-needed rows, and a met parent (Competence 2/2) with an unmet sub-minimum
// (Prevention & Detection 0/1) must stay under Still needed, not Complete.
it('excludes a parent from Complete when its sub-minimum is unmet, and the headline matches the visible rows', () => {
  const credits: Credit[] = [
    { id: 'ethics', provider: 'p', activityTitle: 'Ethics', completionDate: '2026-01-01', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } },
    { id: 'competence', provider: 'p', activityTitle: 'Competence', completionDate: '2026-01-01', totalHours: 2, participatory: true, categoryHours: { competence: 2 } },
    { id: 'bias', provider: 'p', activityTitle: 'Bias', completionDate: '2026-01-01', totalHours: 2, participatory: true, categoryHours: { bias: 2, biasImplicit: 1 } },
    { id: 'tech', provider: 'p', activityTitle: 'Tech', completionDate: '2026-01-01', totalHours: 1, participatory: true, categoryHours: { technology: 1 } },
  ]
  const result = calculateCompliance(REQUIREMENT_RULES, credits)
  render(<Dashboard name="Maya Hoffman" group={2}
    period={{ start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }}
    result={result} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)

  // 4 still-needed top-level rows: total, competence, civility, participatory.
  expect(screen.getByText('4 requirements left')).toBeInTheDocument()
  const stillNeededList = screen.getByText('Still needed').nextElementSibling!
  expect(stillNeededList.querySelectorAll(':scope > .item')).toHaveLength(4)
  // Competence must not appear in Complete, even though its own category hours are met.
  const completeList = screen.getByText('Complete').nextElementSibling!
  expect(completeList.querySelectorAll(':scope > .item')).toHaveLength(3)
})

// mockups.html#s-dash renders "Total hours" and "Participatory" as flat rows (no chevron,
// no expandable credit panel) — only the subject-matter category rows are accordions.
it('renders Total hours and Participatory as flat rows with no expand control', () => {
  const credits: Credit[] = [
    { id: 'ethics', provider: 'p', activityTitle: 'Ethics', completionDate: '2026-01-01', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } },
  ]
  const result = calculateCompliance(REQUIREMENT_RULES, credits)
  render(<Dashboard name="Maya Hoffman" group={2}
    period={{ start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }}
    result={result} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)

  const totalRow = screen.getByText('Total hours').closest('.item')!
  const participatoryRow = screen.getByText('Participatory').closest('.item')!
  for (const item of [totalRow, participatoryRow]) {
    expect(item.querySelector('.chev')).not.toBeInTheDocument()
    expect(item.querySelector('.credits')).not.toBeInTheDocument()
    expect(item.querySelector('.row.tap')).not.toBeInTheDocument()
  }
})

it('hides the Past cycles link by default on both the empty and populated dashboard', () => {
  const emptyResult = calculateCompliance(REQUIREMENT_RULES, [])
  const { rerender } = render(<Dashboard name="Maya Hoffman" group={2}
    period={{ start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }}
    result={emptyResult} credits={[]} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.queryByText(/past cycles/i)).not.toBeInTheDocument()

  const credits: Credit[] = [{
    id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22',
    totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
  }]
  const populatedResult = calculateCompliance(REQUIREMENT_RULES, credits)
  rerender(<Dashboard name="Maya Hoffman" group={2}
    period={{ start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }}
    result={populatedResult} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.queryByText(/past cycles/i)).not.toBeInTheDocument()
})

it('shows the Past cycles link on the empty dashboard when hasPastCycles is true, and calls onOpenPastCycles', () => {
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  const onOpenPastCycles = vi.fn()
  render(<Dashboard name="Maya Hoffman" group={2}
    period={{ start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }}
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
  render(<Dashboard name="Maya Hoffman" group={2}
    period={{ start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }}
    result={result} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}}
    hasPastCycles onOpenPastCycles={onOpenPastCycles} />)
  const link = screen.getByText(/past cycles/i)
  fireEvent.click(link)
  expect(onOpenPastCycles).toHaveBeenCalled()
})

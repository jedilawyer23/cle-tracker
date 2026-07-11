// ABOUTME: Tests the Past Cycles history screen — grouping by prior reporting cycle, the
// ABOUTME: per-cycle compliance summary, tappable credit rows, and the empty state.
import { render, screen, fireEvent } from '@testing-library/react'
import { PastCycles } from '../PastCycles'
import type { Credit, Period } from '../../domain/types'

// Group 3 calendar (from domain/requirements.ts):
//   past:    2023-02-01 - 2026-03-29, reportBy 2026-03-30
//   current: 2026-02-01 - 2029-03-29, reportBy 2029-03-30
const currentPeriod: Period = { start: '2026-02-01', end: '2029-03-29', reportBy: '2029-03-30' }

const pastCredit: Credit = {
  id: 'past-1', provider: 'CEB', activityTitle: 'Old Ethics Course', completionDate: '2024-05-01',
  totalHours: 10, participatory: true, categoryHours: { ethics: 10 },
}
const currentCredit: Credit = {
  id: 'cur-1', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-05-01',
  totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
}

it('renders the header and a working back control', () => {
  const onBack = vi.fn()
  render(<PastCycles group={3} currentPeriod={currentPeriod} credits={[]}
    onOpenCredit={() => {}} onBack={onBack} />)
  expect(screen.getByText('Past cycles')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /back/i }))
  expect(onBack).toHaveBeenCalled()
})

it('shows the empty note when there are no credits from other cycles', () => {
  render(<PastCycles group={3} currentPeriod={currentPeriod} credits={[currentCredit]}
    onOpenCredit={() => {}} onBack={() => {}} />)
  expect(screen.getByText(/no credits from prior reporting cycles/i)).toBeInTheDocument()
})

it('excludes the current cycle and shows only the past cycle group', () => {
  render(<PastCycles group={3} currentPeriod={currentPeriod} credits={[pastCredit, currentCredit]}
    onOpenCredit={() => {}} onBack={() => {}} />)
  expect(screen.queryByText('Conflicts of Interest')).not.toBeInTheDocument()
  expect(screen.getByText('Old Ethics Course')).toBeInTheDocument()
  // Cycle window for group 3's past calendar period: 2023-02-01 - 2026-03-29.
  expect(screen.getByText(/Feb 1, 2023.*Mar 29, 2026/)).toBeInTheDocument()
})

it('shows a not-compliant summary with earned hours for an under-hours past cycle', () => {
  render(<PastCycles group={3} currentPeriod={currentPeriod} credits={[pastCredit]}
    onOpenCredit={() => {}} onBack={() => {}} />)
  expect(screen.getByText(/10 of 25 hrs.*not compliant/i)).toBeInTheDocument()
})

it('shows a compliant summary for a fully-met past cycle', () => {
  const credits: Credit[] = [
    { id: 'e', provider: 'p', activityTitle: 'Ethics', completionDate: '2024-01-01', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } },
    { id: 'c', provider: 'p', activityTitle: 'Competence', completionDate: '2024-01-01', totalHours: 2, participatory: true, categoryHours: { competence: 2, competencePrevention: 1 } },
    { id: 'b', provider: 'p', activityTitle: 'Bias', completionDate: '2024-01-01', totalHours: 2, participatory: true, categoryHours: { bias: 2, biasImplicit: 1 } },
    { id: 't', provider: 'p', activityTitle: 'Tech', completionDate: '2024-01-01', totalHours: 1, participatory: true, categoryHours: { technology: 1 } },
    { id: 'v', provider: 'p', activityTitle: 'Civility', completionDate: '2024-01-01', totalHours: 1, participatory: true, categoryHours: { civility: 1 } },
    { id: 'g', provider: 'p', activityTitle: 'General', completionDate: '2024-01-01', totalHours: 15, participatory: true, categoryHours: {} },
  ]
  render(<PastCycles group={3} currentPeriod={currentPeriod} credits={credits}
    onOpenCredit={() => {}} onBack={() => {}} />)
  expect(screen.getByText('Compliant')).toBeInTheDocument()
})

it('renders a credit row with title, provider/date, and hours, and opens it on click', () => {
  const onOpenCredit = vi.fn()
  render(<PastCycles group={3} currentPeriod={currentPeriod} credits={[pastCredit]}
    onOpenCredit={onOpenCredit} onBack={() => {}} />)
  expect(screen.getByText(/CEB.*May 1, 2024/)).toBeInTheDocument()
  expect(screen.getByText('10 hr')).toBeInTheDocument()
  fireEvent.click(screen.getByText('Old Ethics Course'))
  expect(onOpenCredit).toHaveBeenCalledWith('past-1')
})

it('lists multiple credits within the same past cycle, newest first', () => {
  const earlier: Credit = {
    id: 'past-2', provider: 'Bar Assoc', activityTitle: 'Earlier CLE', completionDate: '2023-06-01',
    totalHours: 5, participatory: true, categoryHours: {},
  }
  render(<PastCycles group={3} currentPeriod={currentPeriod} credits={[pastCredit, earlier]}
    onOpenCredit={() => {}} onBack={() => {}} />)
  const rows = screen.getAllByText(/CLE|Course/)
  const titles = rows.map(el => el.textContent)
  expect(titles.indexOf('Old Ethics Course')).toBeLessThan(titles.indexOf('Earlier CLE'))
})

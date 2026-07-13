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
  render(<Dashboard name="Maya Hoffman" period={PERIOD}
    result={result} credits={[]} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.getByText('Legal Ethics')).toBeInTheDocument()
  expect(screen.getByText(/Mar 30, 2027|2027-03-30/)).toBeInTheDocument()
})

it('shows the reporting cycle window on the empty dashboard', () => {
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  render(<Dashboard name="Maya Hoffman" period={PERIOD}
    result={result} credits={[]} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.getByText(/Reporting cycle:.*Feb 1, 2024.*Mar 29, 2027/)).toBeInTheDocument()
  expect(screen.getByText(/hours required.*report by.*Mar 30, 2027/)).toBeInTheDocument()
})

// A floating-point sum of logged hours (e.g. 1.2 + 2.2) must round for display, not render as
// "3.4000000000000004 of 25 hours logged".
it('rounds a floating-point earned total for display', () => {
  const credits: Credit[] = [
    { id: 'a', provider: 'CEB', activityTitle: 'A', completionDate: '2026-01-22', totalHours: 1.2, participatory: true, categoryHours: { ethics: 1.2 } },
    { id: 'b', provider: 'CEB', activityTitle: 'B', completionDate: '2026-01-23', totalHours: 2.2, participatory: true, categoryHours: { ethics: 2.2 } },
  ]
  const result = calculateCompliance(REQUIREMENT_RULES, credits)
  render(<Dashboard name="Maya Hoffman" period={PERIOD}
    result={result} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.getByText(/3\.4 of 25 hours logged/)).toBeInTheDocument()
  expect(screen.queryByText(/3\.4000000000000004/)).not.toBeInTheDocument()
})

it('shows a compliant affirmation banner once every requirement is met', () => {
  const credits: Credit[] = [
    { id: '1', provider: 'A', activityTitle: 'Ethics', completionDate: '2026-01-02', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } },
    { id: '2', provider: 'B', activityTitle: 'Competence', completionDate: '2026-01-03', totalHours: 2, participatory: true, categoryHours: { competence: 2, competencePrevention: 1 } },
    { id: '3', provider: 'C', activityTitle: 'Bias', completionDate: '2026-01-04', totalHours: 2, participatory: true, categoryHours: { bias: 2, biasImplicit: 1 } },
    { id: '4', provider: 'D', activityTitle: 'Tech', completionDate: '2026-01-05', totalHours: 1, participatory: true, categoryHours: { technology: 1 } },
    { id: '5', provider: 'E', activityTitle: 'Civility', completionDate: '2026-01-06', totalHours: 1, participatory: true, categoryHours: { civility: 1 } },
    { id: '6', provider: 'F', activityTitle: 'General', completionDate: '2026-01-07', totalHours: 15, participatory: true, categoryHours: {} },
  ]
  const result = calculateCompliance(REQUIREMENT_RULES, credits)
  render(<Dashboard name="Maya Hoffman" period={PERIOD}
    result={result} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.getByText("You're compliant")).toBeInTheDocument()
  expect(document.querySelector('.compliant-banner')).toBeInTheDocument()
})

it('does not show the compliant affirmation banner while requirements remain', () => {
  const credits: Credit[] = [{
    id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22',
    totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
  }]
  const result = calculateCompliance(REQUIREMENT_RULES, credits)
  render(<Dashboard name="Maya Hoffman" period={PERIOD}
    result={result} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(document.querySelector('.compliant-banner')).not.toBeInTheDocument()
})

it('shows the reporting cycle window on the populated dashboard', () => {
  const credits: Credit[] = [{
    id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22',
    totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
  }]
  const result = calculateCompliance(REQUIREMENT_RULES, credits)
  render(<Dashboard name="Maya Hoffman" period={PERIOD}
    result={result} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.getByText(/Reporting cycle:.*Feb 1, 2024.*Mar 29, 2027/)).toBeInTheDocument()
  expect(screen.getByText(/Report by.*Mar 30, 2027.*days left.*4 of 25 hours logged/)).toBeInTheDocument()
})

// The reporting deadline can pass while a stale period is still displayed (or while the user
// simply hasn't reported yet) — must clamp at 0, never show "-N days left".
it('shows an overdue state instead of negative days when the reporting deadline has passed', () => {
  const credits: Credit[] = [{
    id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22',
    totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
  }]
  const result = calculateCompliance(REQUIREMENT_RULES, credits)
  render(<Dashboard name="Maya Hoffman" period={PERIOD}
    result={result} credits={credits} today="2027-04-15"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.getByText(/overdue/i)).toBeInTheDocument()
  expect(screen.queryByText(/-\d+ days left/)).not.toBeInTheDocument()
})

it('shows the clekeeper wordmark on both the empty and populated dashboards', () => {
  const credits: Credit[] = [{
    id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22',
    totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
  }]
  for (const list of [[], credits]) {
    const result = calculateCompliance(REQUIREMENT_RULES, list)
    const { unmount } = render(<Dashboard name="Maya Hoffman" period={PERIOD}
      result={result} credits={list} today="2026-07-10"
      accountState="guest" onSignIn={() => {}}
      onAddCredit={() => {}} onOpenCredit={() => {}} />)
    expect(document.querySelector('.topline .brand')).toHaveTextContent('clekeeper')
    unmount()
  }
})

it('renders the sign-in affordance as the first child inside the content wrap', () => {
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  const { container } = render(<Dashboard name="Maya Hoffman" period={PERIOD}
    result={result} credits={[]} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  const wrap = container.querySelector('.wrap')!
  expect(wrap.firstElementChild).toHaveClass('topline')
  expect(wrap.querySelector('.topline .navbtn')).toHaveTextContent(/sign in to save/i)
})

it('renders the signInMessage note inside the wrap, under the topline', () => {
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  render(<Dashboard name="Maya Hoffman" period={PERIOD}
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
  const { container } = render(<Dashboard name="Maya Hoffman" period={PERIOD}
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
  const { container } = render(<Dashboard name="Maya Hoffman" period={PERIOD}
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
  const { container } = render(<Dashboard name="Maya Hoffman" period={PERIOD}
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

// The sub-requirement catch: 25+ hours logged is easy to mistake for "done" while a small
// standalone or sub-minimum is still short. Surface it prominently and by name.
it('calls out a short standalone requirement by name once the total hours are met', () => {
  const credits: Credit[] = [
    { id: 'ethics', provider: 'p', activityTitle: 'Ethics', completionDate: '2026-01-01', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } },
    { id: 'competence', provider: 'p', activityTitle: 'Competence', completionDate: '2026-01-01', totalHours: 2, participatory: true, categoryHours: { competence: 2, competencePrevention: 1 } },
    { id: 'bias', provider: 'p', activityTitle: 'Bias', completionDate: '2026-01-01', totalHours: 2, participatory: true, categoryHours: { bias: 2, biasImplicit: 1 } },
    { id: 'tech', provider: 'p', activityTitle: 'Tech', completionDate: '2026-01-01', totalHours: 1, participatory: true, categoryHours: { technology: 1 } },
    { id: 'general', provider: 'p', activityTitle: 'General', completionDate: '2026-01-01', totalHours: 16, participatory: true, categoryHours: {} },
  ]
  const result = calculateCompliance(REQUIREMENT_RULES, credits)
  const { container } = render(<Dashboard name="Maya Hoffman" period={PERIOD}
    result={result} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  const callout = container.querySelector('.subreq-catch')!
  expect(callout).toBeInTheDocument()
  expect(callout).toHaveTextContent(/25 hours/)
  expect(callout).toHaveTextContent(/1 Civility hour\b/)
})

// A met parent (Elimination of Bias 2/2) with an unmet sub-minimum (Implicit Bias 0/1) must name
// the child, not the parent — that's the gap the attorney would miss.
it('names an unmet sub-minimum by its own label in the catch callout', () => {
  const credits: Credit[] = [
    { id: 'ethics', provider: 'p', activityTitle: 'Ethics', completionDate: '2026-01-01', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } },
    { id: 'competence', provider: 'p', activityTitle: 'Competence', completionDate: '2026-01-01', totalHours: 2, participatory: true, categoryHours: { competence: 2, competencePrevention: 1 } },
    { id: 'bias', provider: 'p', activityTitle: 'Bias', completionDate: '2026-01-01', totalHours: 2, participatory: true, categoryHours: { bias: 2 } },
    { id: 'tech', provider: 'p', activityTitle: 'Tech', completionDate: '2026-01-01', totalHours: 1, participatory: true, categoryHours: { technology: 1 } },
    { id: 'civility', provider: 'p', activityTitle: 'Civility', completionDate: '2026-01-01', totalHours: 1, participatory: true, categoryHours: { civility: 1 } },
    { id: 'general', provider: 'p', activityTitle: 'General', completionDate: '2026-01-01', totalHours: 15, participatory: true, categoryHours: {} },
  ]
  const result = calculateCompliance(REQUIREMENT_RULES, credits)
  const { container } = render(<Dashboard name="Maya Hoffman" period={PERIOD}
    result={result} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  const callout = container.querySelector('.subreq-catch')!
  expect(callout).toBeInTheDocument()
  expect(callout).toHaveTextContent(/Implicit Bias/)
})

// Multiple simultaneous gaps read in REQUIREMENT_RULES order, joined, with correct singular/plural.
it('lists multiple catch shortfalls in order with correct singular/plural wording', () => {
  const credits: Credit[] = [
    { id: 'ethics', provider: 'p', activityTitle: 'Ethics', completionDate: '2026-01-01', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } },
    { id: 'competence', provider: 'p', activityTitle: 'Competence', completionDate: '2026-01-01', totalHours: 2, participatory: true, categoryHours: { competence: 2, competencePrevention: 1 } },
    { id: 'bias', provider: 'p', activityTitle: 'Bias', completionDate: '2026-01-01', totalHours: 2, participatory: true, categoryHours: { bias: 2, biasImplicit: 1 } },
    { id: 'tech', provider: 'p', activityTitle: 'Tech', completionDate: '2026-01-01', totalHours: 1, participatory: true, categoryHours: { technology: 1 } },
    // 16 non-participatory general hours reach 25 total but leave participatory at 9/12.5, and
    // civility untouched — two gaps at once.
    { id: 'general', provider: 'p', activityTitle: 'General', completionDate: '2026-01-01', totalHours: 16, participatory: false, categoryHours: {} },
  ]
  const result = calculateCompliance(REQUIREMENT_RULES, credits)
  const { container } = render(<Dashboard name="Maya Hoffman" period={PERIOD}
    result={result} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  const callout = container.querySelector('.subreq-catch')!
  expect(callout).toHaveTextContent('still short on 1 Civility hour, 3.5 Participatory hours.')
})

// The displayed hour count drives singular/plural, not the raw float: a remaining of 1.04 shows
// as "1" and must read "1 hour", never "1 hours".
it('pluralizes the catch wording from the displayed hours, not the raw remaining', () => {
  const credits: Credit[] = [
    { id: 'ethics', provider: 'p', activityTitle: 'Ethics', completionDate: '2026-01-01', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } },
    { id: 'competence', provider: 'p', activityTitle: 'Competence', completionDate: '2026-01-01', totalHours: 2, participatory: true, categoryHours: { competence: 2, competencePrevention: 1 } },
    { id: 'bias', provider: 'p', activityTitle: 'Bias', completionDate: '2026-01-01', totalHours: 2, participatory: true, categoryHours: { bias: 2, biasImplicit: 1 } },
    { id: 'tech', provider: 'p', activityTitle: 'Tech', completionDate: '2026-01-01', totalHours: 1, participatory: true, categoryHours: { technology: 1 } },
    { id: 'civility', provider: 'p', activityTitle: 'Civility', completionDate: '2026-01-01', totalHours: 1, participatory: true, categoryHours: { civility: 1 } },
    // Participatory reaches 11.46 (remaining 1.04, shown as 1); non-participatory hours top up to 25.
    { id: 'partial', provider: 'p', activityTitle: 'Partial', completionDate: '2026-01-01', totalHours: 1.46, participatory: true, categoryHours: {} },
    { id: 'general', provider: 'p', activityTitle: 'General', completionDate: '2026-01-01', totalHours: 13.54, participatory: false, categoryHours: {} },
  ]
  const result = calculateCompliance(REQUIREMENT_RULES, credits)
  const { container } = render(<Dashboard name="Maya Hoffman" period={PERIOD}
    result={result} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  const callout = container.querySelector('.subreq-catch')!
  expect(callout).toHaveTextContent('1 Participatory hour.')
  expect(callout).not.toHaveTextContent('1 Participatory hours')
})

it('does not show the catch callout while the total hours are still short', () => {
  const credits: Credit[] = [{
    id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22',
    totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
  }]
  const result = calculateCompliance(REQUIREMENT_RULES, credits)
  const { container } = render(<Dashboard name="Maya Hoffman" period={PERIOD}
    result={result} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(container.querySelector('.subreq-catch')).not.toBeInTheDocument()
})

it('does not show the catch callout once every requirement is met', () => {
  const credits: Credit[] = [
    { id: '1', provider: 'A', activityTitle: 'Ethics', completionDate: '2026-01-02', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } },
    { id: '2', provider: 'B', activityTitle: 'Competence', completionDate: '2026-01-03', totalHours: 2, participatory: true, categoryHours: { competence: 2, competencePrevention: 1 } },
    { id: '3', provider: 'C', activityTitle: 'Bias', completionDate: '2026-01-04', totalHours: 2, participatory: true, categoryHours: { bias: 2, biasImplicit: 1 } },
    { id: '4', provider: 'D', activityTitle: 'Tech', completionDate: '2026-01-05', totalHours: 1, participatory: true, categoryHours: { technology: 1 } },
    { id: '5', provider: 'E', activityTitle: 'Civility', completionDate: '2026-01-06', totalHours: 1, participatory: true, categoryHours: { civility: 1 } },
    { id: '6', provider: 'F', activityTitle: 'General', completionDate: '2026-01-07', totalHours: 15, participatory: true, categoryHours: {} },
  ]
  const result = calculateCompliance(REQUIREMENT_RULES, credits)
  const { container } = render(<Dashboard name="Maya Hoffman" period={PERIOD}
    result={result} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(container.querySelector('.subreq-catch')).not.toBeInTheDocument()
})

it('lets a category row expand to its contributing credits, and does not expand Total hours or Participatory', () => {
  const credits: Credit[] = [{
    id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22',
    totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
  }]
  const result = calculateCompliance(REQUIREMENT_RULES, credits)
  render(<Dashboard name="Maya Hoffman" period={PERIOD}
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
  const { rerender } = render(<Dashboard name="Maya Hoffman" period={PERIOD}
    result={emptyResult} credits={[]} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.queryByText(/past cycles/i)).not.toBeInTheDocument()

  const credits: Credit[] = [{
    id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22',
    totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
  }]
  const populatedResult = calculateCompliance(REQUIREMENT_RULES, credits)
  rerender(<Dashboard name="Maya Hoffman" period={PERIOD}
    result={populatedResult} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.queryByText(/past cycles/i)).not.toBeInTheDocument()
})

it('shows the Past cycles link on the empty dashboard when hasPastCycles is true, and calls onOpenPastCycles', () => {
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  const onOpenPastCycles = vi.fn()
  render(<Dashboard name="Maya Hoffman" period={PERIOD}
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
  render(<Dashboard name="Maya Hoffman" period={PERIOD}
    result={result} credits={credits} today="2026-07-10"
    accountState="guest" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}}
    hasPastCycles onOpenPastCycles={onOpenPastCycles} />)
  const link = screen.getByText(/past cycles/i)
  fireEvent.click(link)
  expect(onOpenPastCycles).toHaveBeenCalled()
})

it('threads name and photoURL to the signed-in header', () => {
  render(<Dashboard name="Maya Hoffman" photoURL="https://example.com/p.jpg" period={PERIOD}
    result={calculateCompliance(REQUIREMENT_RULES, [])} credits={[]} today="2026-07-10"
    accountState="linked" onSignIn={() => {}}
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.getByText('Maya Hoffman')).toBeInTheDocument()
  expect(document.querySelector('img.avatar')).toHaveAttribute('src', 'https://example.com/p.jpg')
})

it('shows a Settings link in the footer nav that fires onSettings on both the empty and populated dashboards', () => {
  const onSettings = vi.fn()
  const credits: Credit[] = [{
    id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22',
    totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
  }]
  for (const list of [[], credits]) {
    const result = calculateCompliance(REQUIREMENT_RULES, list)
    const { unmount } = render(<Dashboard name="Maya Hoffman" period={PERIOD}
      result={result} credits={list} today="2026-07-10"
      accountState="guest" onSignIn={() => {}} onSettings={onSettings}
      onAddCredit={() => {}} onOpenCredit={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /settings/i }))
    unmount()
  }
  expect(onSettings).toHaveBeenCalledTimes(2)
})

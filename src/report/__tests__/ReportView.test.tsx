// ABOUTME: Verifies the printable report preview renders the report content and that "Save as PDF"
// ABOUTME: invokes the injected print function (window.print in production) and Back navigates away.
import { it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { ReportView } from '../ReportView'
import { buildReportContent } from '../buildReportContent'
import { calculateCompliance } from '../../domain/complianceCalculator'
import { REQUIREMENT_RULES } from '../../domain/requirements'
import type { Credit } from '../../domain/types'

const period = { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }
const credit: Credit = {
  id: 'a', provider: 'PLI', activityTitle: 'Ethics in the Age of AI', completionDate: '2026-03-04',
  totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
}

function contentFor(credits: Credit[]) {
  const result = calculateCompliance(REQUIREMENT_RULES, credits)
  return buildReportContent({ name: 'Maya Hoffman', group: 2, period, result, credits, today: '2026-07-10' })
}

it('renders the report heading, verdict, requirements and a logged credit', () => {
  render(<ReportView content={contentFor([credit])} onBack={() => {}} print={() => {}} />)
  expect(screen.getByText('Maya Hoffman')).toBeInTheDocument()
  expect(screen.getByText(/MCLE Compliance Report/i)).toBeInTheDocument()
  expect(screen.getByText(/Not yet compliant/i)).toBeInTheDocument()
  expect(screen.getByText('Legal Ethics')).toBeInTheDocument()
  // The logged credit appears in the credits table.
  expect(screen.getByText('Ethics in the Age of AI')).toBeInTheDocument()
})

it('shows an empty-credits note when nothing is logged', () => {
  render(<ReportView content={contentFor([])} onBack={() => {}} print={() => {}} />)
  expect(screen.getByText(/No credits logged/i)).toBeInTheDocument()
})

it('invokes the injected print function when Save as PDF is tapped', () => {
  const print = vi.fn()
  render(<ReportView content={contentFor([credit])} onBack={() => {}} print={print} />)
  fireEvent.click(screen.getByRole('button', { name: /save as pdf/i }))
  expect(print).toHaveBeenCalledTimes(1)
})

it('navigates back when Back is tapped', () => {
  const onBack = vi.fn()
  render(<ReportView content={contentFor([credit])} onBack={onBack} print={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /back/i }))
  expect(onBack).toHaveBeenCalledTimes(1)
})

it('marks the verdict compliant once every requirement is met', () => {
  const full: Credit[] = [
    { id: '1', provider: 'A', activityTitle: 'Ethics', completionDate: '2026-01-02', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } },
    { id: '2', provider: 'B', activityTitle: 'Competence', completionDate: '2026-01-03', totalHours: 2, participatory: true, categoryHours: { competence: 2, competencePrevention: 1 } },
    { id: '3', provider: 'C', activityTitle: 'Bias', completionDate: '2026-01-04', totalHours: 2, participatory: true, categoryHours: { bias: 2, biasImplicit: 1 } },
    { id: '4', provider: 'D', activityTitle: 'Tech', completionDate: '2026-01-05', totalHours: 1, participatory: true, categoryHours: { technology: 1 } },
    { id: '5', provider: 'E', activityTitle: 'Civility', completionDate: '2026-01-06', totalHours: 1, participatory: true, categoryHours: { civility: 1 } },
    { id: '6', provider: 'F', activityTitle: 'General', completionDate: '2026-01-07', totalHours: 15, participatory: true, categoryHours: {} },
  ]
  render(<ReportView content={contentFor(full)} onBack={() => {}} print={() => {}} />)
  const banner = document.querySelector('.rep-banner')!
  expect(within(banner as HTMLElement).getByText(/^Compliant$/i)).toBeInTheDocument()
})

// ABOUTME: Verifies the report preview renders the content and hands the reader a downloadable PDF
// ABOUTME: (a native <a download> once the injected generator resolves) with a working Back control.
import { it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
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
const fakePdf = () => Promise.resolve(new Blob(['%PDF-'], { type: 'application/pdf' }))

function contentFor(credits: Credit[]) {
  const result = calculateCompliance(REQUIREMENT_RULES, credits)
  return buildReportContent({ name: 'Maya Hoffman', group: 2, period, result, credits, today: '2026-07-10' })
}

beforeEach(() => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:report')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})

it('renders the report heading, verdict, requirements and a logged credit', () => {
  render(<ReportView content={contentFor([credit])} onBack={() => {}} generatePdf={fakePdf} />)
  expect(screen.getByText('Maya Hoffman')).toBeInTheDocument()
  expect(screen.getByText(/MCLE Compliance Report/i)).toBeInTheDocument()
  expect(screen.getByText(/Not yet compliant/i)).toBeInTheDocument()
  expect(screen.getByText('Legal Ethics')).toBeInTheDocument()
  expect(screen.getByText('Ethics in the Age of AI')).toBeInTheDocument()
})

it('shows an empty-credits note when nothing is logged', () => {
  render(<ReportView content={contentFor([])} onBack={() => {}} generatePdf={fakePdf} />)
  expect(screen.getByText(/No credits logged/i)).toBeInTheDocument()
})

it('shows Preparing… until the PDF is built, then a native download link', async () => {
  let resolve!: (b: Blob) => void
  const generatePdf = () => new Promise<Blob>(r => { resolve = r })
  render(<ReportView content={contentFor([credit])} onBack={() => {}} generatePdf={generatePdf} />)
  expect(screen.getByRole('button', { name: /preparing/i })).toBeDisabled()
  expect(screen.queryByRole('link', { name: /save as pdf/i })).not.toBeInTheDocument()

  resolve(new Blob(['%PDF-'], { type: 'application/pdf' }))
  const link = await screen.findByRole('link', { name: /save as pdf/i })
  expect(link).toHaveAttribute('href', 'blob:report')
  expect(link).toHaveAttribute('download', 'MCLE-report-2026-07-10.pdf')
})

it('shows a retry control instead of staying on Preparing… forever when PDF generation fails, and retrying can succeed', async () => {
  const generatePdf = vi.fn()
    .mockRejectedValueOnce(new Error('boom'))
    .mockResolvedValueOnce(new Blob(['%PDF-'], { type: 'application/pdf' }))
  render(<ReportView content={contentFor([credit])} onBack={() => {}} generatePdf={generatePdf} />)

  const retry = await screen.findByRole('button', { name: /couldn.?t build the pdf.*retry/i })
  expect(retry).not.toBeDisabled()
  expect(screen.queryByRole('button', { name: /preparing/i })).not.toBeInTheDocument()

  fireEvent.click(retry)
  expect(await screen.findByRole('button', { name: /preparing/i })).toBeDisabled()
  const link = await screen.findByRole('link', { name: /save as pdf/i })
  expect(link).toHaveAttribute('href', 'blob:report')
  expect(generatePdf).toHaveBeenCalledTimes(2)
})

it('navigates back when Back is tapped', () => {
  const onBack = vi.fn()
  render(<ReportView content={contentFor([credit])} onBack={onBack} generatePdf={fakePdf} />)
  fireEvent.click(screen.getByRole('button', { name: /back/i }))
  expect(onBack).toHaveBeenCalledTimes(1)
})

it('marks the verdict compliant once every requirement is met', async () => {
  const full: Credit[] = [
    { id: '1', provider: 'A', activityTitle: 'Ethics', completionDate: '2026-01-02', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } },
    { id: '2', provider: 'B', activityTitle: 'Competence', completionDate: '2026-01-03', totalHours: 2, participatory: true, categoryHours: { competence: 2, competencePrevention: 1 } },
    { id: '3', provider: 'C', activityTitle: 'Bias', completionDate: '2026-01-04', totalHours: 2, participatory: true, categoryHours: { bias: 2, biasImplicit: 1 } },
    { id: '4', provider: 'D', activityTitle: 'Tech', completionDate: '2026-01-05', totalHours: 1, participatory: true, categoryHours: { technology: 1 } },
    { id: '5', provider: 'E', activityTitle: 'Civility', completionDate: '2026-01-06', totalHours: 1, participatory: true, categoryHours: { civility: 1 } },
    { id: '6', provider: 'F', activityTitle: 'General', completionDate: '2026-01-07', totalHours: 15, participatory: true, categoryHours: {} },
  ]
  render(<ReportView content={contentFor(full)} onBack={() => {}} generatePdf={fakePdf} />)
  const banner = document.querySelector('.rep-banner')!
  await waitFor(() => expect(within(banner as HTMLElement).getByText(/^Compliant$/i)).toBeInTheDocument())
})

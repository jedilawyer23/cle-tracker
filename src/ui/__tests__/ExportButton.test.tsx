// ABOUTME: Verifies the injectable onExport test seam, and the native-anchor download path —
// ABOUTME: a blob URL is pre-generated so the eventual click is a gesture-independent <a download>.
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { ExportButton } from '../ExportButton'
import { calculateCompliance } from '../../domain/complianceCalculator'
import { REQUIREMENT_RULES } from '../../domain/requirements'
import type { Credit } from '../../domain/types'

vi.mock('../../report/renderReportPdf', () => ({
  generateReportBlobUrl: vi.fn(),
}))
import { generateReportBlobUrl } from '../../report/renderReportPdf'

const mockGenerate = generateReportBlobUrl as ReturnType<typeof vi.fn>

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(r => { resolve = r })
  return { promise, resolve }
}

const period = { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }
const credit: Credit = {
  id: 'a', provider: 'PLI', activityTitle: 'Ethics in the Age of AI', completionDate: '2026-03-04',
  totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
}

beforeEach(() => {
  mockGenerate.mockReset()
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})

it('renders the report and downloads on click', () => {
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  const onExport = vi.fn()
  render(
    <ExportButton
      name="Maya Hoffman" group={2}
      period={period}
      result={result} credits={[]} today="2026-07-10" onExport={onExport}
    />,
  )
  const button = screen.getByRole('button', { name: /export report/i })
  expect(button).toHaveClass('btn', 'tinted')
  fireEvent.click(button)
  expect(onExport).toHaveBeenCalledWith(expect.objectContaining({ verdict: expect.stringMatching(/not yet compliant/i) }))
})

it('shows a disabled "Preparing report…" state while the blob URL is generating, without touching pdfmake', () => {
  const { promise } = deferred<string>()
  mockGenerate.mockReturnValue(promise)
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  render(
    <ExportButton name="Maya Hoffman" group={2} period={period} result={result} credits={[]} today="2026-07-10" />,
  )
  const button = screen.getByRole('button', { name: /preparing report/i })
  expect(button).toBeDisabled()
  expect(button).toHaveClass('btn', 'tinted')
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})

it('renders a native download anchor with a ready object URL once generation resolves', async () => {
  const { promise, resolve } = deferred<string>()
  mockGenerate.mockReturnValue(promise)
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  render(
    <ExportButton name="Maya Hoffman" group={2} period={period} result={result} credits={[]} today="2026-07-10" />,
  )
  resolve('blob:ready-url')
  const link = await screen.findByRole('link', { name: /export report/i })
  expect(link).toHaveAttribute('href', 'blob:ready-url')
  expect(link).toHaveAttribute('download', 'MCLE-report-2026-07-10.pdf')
  // Secondary action: tinted, not the filled primary pill.
  expect(link).toHaveClass('btn', 'tinted')
})

it('revokes the previous object URL once a newer one is ready after the report input changes', async () => {
  const first = deferred<string>()
  const second = deferred<string>()
  mockGenerate.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  const { rerender } = render(
    <ExportButton name="Maya Hoffman" group={2} period={period} result={result} credits={[]} today="2026-07-10" />,
  )
  first.resolve('blob:first-url')
  await screen.findByRole('link', { name: /export report/i })

  rerender(
    <ExportButton name="Maya Hoffman" group={2} period={period} result={result} credits={[credit]} today="2026-07-10" />,
  )
  second.resolve('blob:second-url')
  await waitFor(() => expect(screen.getByRole('link', { name: /export report/i })).toHaveAttribute('href', 'blob:second-url'))
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:first-url')
})

it('ignores a stale resolution superseded by a newer report input, revoking it instead of applying it', async () => {
  const first = deferred<string>()
  const second = deferred<string>()
  mockGenerate.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  const { rerender } = render(
    <ExportButton name="Maya Hoffman" group={2} period={period} result={result} credits={[]} today="2026-07-10" />,
  )
  rerender(
    <ExportButton name="Maya Hoffman" group={2} period={period} result={result} credits={[credit]} today="2026-07-10" />,
  )
  // Second (newer) request resolves first; the stale first request resolves after.
  second.resolve('blob:second-url')
  await screen.findByRole('link', { name: /export report/i })
  first.resolve('blob:first-url')

  await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:first-url'))
  expect(screen.getByRole('link', { name: /export report/i })).toHaveAttribute('href', 'blob:second-url')
})

it('revokes the object URL on unmount', async () => {
  const { promise, resolve } = deferred<string>()
  mockGenerate.mockReturnValue(promise)
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  const { unmount } = render(
    <ExportButton name="Maya Hoffman" group={2} period={period} result={result} credits={[]} today="2026-07-10" />,
  )
  resolve('blob:ready-url')
  await screen.findByRole('link', { name: /export report/i })
  unmount()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:ready-url')
})

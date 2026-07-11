// ABOUTME: Verifies the export button assembles content and hands it to the renderer on click.
// ABOUTME: Injects onExport as a test seam so no real jsPDF render/download runs in this test.
import { render, screen, fireEvent } from '@testing-library/react'
import { ExportButton } from '../ExportButton'
import { calculateCompliance } from '../../domain/complianceCalculator'
import { REQUIREMENT_RULES } from '../../domain/requirements'

it('renders the report and downloads on click', () => {
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  const onExport = vi.fn()
  render(
    <ExportButton
      name="Maya Hoffman" group={2}
      period={{ start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }}
      result={result} credits={[]} today="2026-07-10" onExport={onExport}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: /export report/i }))
  expect(onExport).toHaveBeenCalledWith(expect.objectContaining({ verdict: expect.stringMatching(/not yet compliant/i) }))
})

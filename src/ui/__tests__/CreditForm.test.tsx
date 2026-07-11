// ABOUTME: Tests the shared editable credit form: validation gating and save payload.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CreditForm } from '../CreditForm'

describe('CreditForm', () => {
  it('does not save while required fields are missing', () => {
    const onSave = vi.fn()
    render(<CreditForm submitLabel="Save credit" onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: /save credit/i }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText(/provider is required/i)).toBeInTheDocument()
  })

  it('saves a valid credit', () => {
    const onSave = vi.fn()
    render(<CreditForm submitLabel="Save credit" onSave={onSave} />)
    fireEvent.change(screen.getByLabelText(/provider/i), { target: { value: 'CEB' } })
    fireEvent.change(screen.getByLabelText(/activity title/i), { target: { value: 'Ethics' } })
    fireEvent.change(screen.getByLabelText(/completion date/i), { target: { value: '2026-01-22' } })
    fireEvent.change(screen.getByLabelText(/total hours/i), { target: { value: '1.5' } })
    fireEvent.change(screen.getByLabelText(/^legal ethics$/i), { target: { value: '1.5' } })
    fireEvent.click(screen.getByRole('button', { name: /save credit/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'CEB', activityTitle: 'Ethics', completionDate: '2026-01-22',
      totalHours: 1.5, participatory: true, categoryHours: { ethics: 1.5 },
    }))
  })

  it('flags low-confidence fields for attention and leaves others unflagged', () => {
    render(<CreditForm submitLabel="Save credit" onSave={vi.fn()} lowConfidenceFields={['participatory']} />)
    expect(screen.getAllByText(/couldn.?t read — please confirm/i)).toHaveLength(1)
    expect(screen.queryByLabelText(/^provider$/i)?.closest('.field')?.textContent)
      .not.toMatch(/couldn.?t read/i)
  })

  const currentPeriod = { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }

  it('warns, without blocking save, when the completion date falls outside the current cycle', () => {
    const onSave = vi.fn()
    render(<CreditForm submitLabel="Save credit" onSave={onSave} currentPeriod={currentPeriod} />)
    fireEvent.change(screen.getByLabelText(/provider/i), { target: { value: 'CEB' } })
    fireEvent.change(screen.getByLabelText(/activity title/i), { target: { value: 'Ethics' } })
    fireEvent.change(screen.getByLabelText(/completion date/i), { target: { value: '2023-01-01' } })
    fireEvent.change(screen.getByLabelText(/total hours/i), { target: { value: '1.5' } })
    fireEvent.change(screen.getByLabelText(/^legal ethics$/i), { target: { value: '1.5' } })

    expect(screen.getByText(/different reporting cycle/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /save credit/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ completionDate: '2023-01-01' }))
  })

  it('shows no out-of-cycle warning when the completion date is inside the current cycle', () => {
    render(<CreditForm submitLabel="Save credit" onSave={vi.fn()} currentPeriod={currentPeriod} />)
    fireEvent.change(screen.getByLabelText(/completion date/i), { target: { value: '2026-01-22' } })
    expect(screen.queryByText(/different reporting cycle/i)).not.toBeInTheDocument()
  })

  it('shows no out-of-cycle warning when no currentPeriod is supplied', () => {
    render(<CreditForm submitLabel="Save credit" onSave={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/completion date/i), { target: { value: '2023-01-01' } })
    expect(screen.queryByText(/different reporting cycle/i)).not.toBeInTheDocument()
  })

  // "Of which" model: Prevention & Detection and Implicit Bias are a subset of their parent's
  // hours, not extra fields — the form nests them under their parent instead of listing them flat.
  it('nests "of which Prevention & Detection" under Competence, and "of which Implicit Bias" under Elimination of Bias', () => {
    render(<CreditForm submitLabel="Save credit" onSave={vi.fn()} />)
    expect(screen.getByLabelText(/^competence$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/of which prevention & detection/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^elimination of bias$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/of which implicit bias/i)).toBeInTheDocument()
  })

  it('saves a course that is entirely Prevention & Detection hours as a subset of Competence, not extra', () => {
    const onSave = vi.fn()
    render(<CreditForm submitLabel="Save credit" onSave={onSave} />)
    fireEvent.change(screen.getByLabelText(/provider/i), { target: { value: 'State Bar of CA' } })
    fireEvent.change(screen.getByLabelText(/activity title/i), { target: { value: 'Attorney Wellness' } })
    fireEvent.change(screen.getByLabelText(/completion date/i), { target: { value: '2026-01-22' } })
    fireEvent.change(screen.getByLabelText(/total hours/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/^competence$/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/of which prevention & detection/i), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: /save credit/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      totalHours: 1, categoryHours: { competence: 1, competencePrevention: 1 },
    }))
  })

  it('rejects a Prevention & Detection sub-hours value that exceeds Competence', () => {
    const onSave = vi.fn()
    render(<CreditForm submitLabel="Save credit" onSave={onSave} />)
    fireEvent.change(screen.getByLabelText(/provider/i), { target: { value: 'p' } })
    fireEvent.change(screen.getByLabelText(/activity title/i), { target: { value: 't' } })
    fireEvent.change(screen.getByLabelText(/completion date/i), { target: { value: '2026-01-22' } })
    fireEvent.change(screen.getByLabelText(/total hours/i), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText(/^competence$/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/of which prevention & detection/i), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: /save credit/i }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText(/prevention & detection hours can't exceed competence hours/i)).toBeInTheDocument()
  })
})

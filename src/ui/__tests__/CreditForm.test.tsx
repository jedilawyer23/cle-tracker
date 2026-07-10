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
})

// ABOUTME: Tests viewing, editing, and removing a single credit.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CreditDetail } from '../CreditDetail'
import type { Credit } from '../../domain/types'

const ethics: Credit = {
  id: '1', provider: 'Practising Law Institute', activityTitle: 'Ethics in the Age of AI',
  completionDate: '2026-03-04', totalHours: 2, participatory: true, categoryHours: { ethics: 2 },
}

describe('CreditDetail', () => {
  it('shows details and which requirements it counts toward', () => {
    render(<CreditDetail credit={ethics} onUpdate={vi.fn()} onRemove={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText('Ethics in the Age of AI')).toBeInTheDocument()
    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText(/legal ethics/i)).toBeInTheDocument()
  })

  it('edits and saves via onUpdate', () => {
    const onUpdate = vi.fn()
    render(<CreditDetail credit={ethics} onUpdate={onUpdate} onRemove={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /edit credit/i }))
    fireEvent.change(screen.getByLabelText(/total hours/i), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /save credit/i }))
    expect(onUpdate).toHaveBeenCalledWith('1', expect.objectContaining({ totalHours: 3 }))
  })

  it('removes via onRemove', () => {
    const onRemove = vi.fn()
    render(<CreditDetail credit={ethics} onUpdate={vi.fn()} onRemove={onRemove} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /remove credit/i }))
    expect(onRemove).toHaveBeenCalledWith('1')
  })
})

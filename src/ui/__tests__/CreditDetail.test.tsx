// ABOUTME: Tests viewing, editing, and removing a single credit — including the remove
// ABOUTME: confirmation step and toast feedback when a save or remove fails.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

  it('edits and saves via onUpdate', async () => {
    const onUpdate = vi.fn(async () => {})
    render(<CreditDetail credit={ethics} onUpdate={onUpdate} onRemove={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /edit credit/i }))
    fireEvent.change(screen.getByLabelText(/total hours/i), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /save credit/i }))
    expect(onUpdate).toHaveBeenCalledWith('1', expect.objectContaining({ totalHours: 3 }))
    await waitFor(() => expect(screen.queryByLabelText(/total hours/i)).not.toBeInTheDocument())
  })

  it('shows a toast and stays in the edit form when saving fails, without discarding the edit', async () => {
    const onUpdate = vi.fn(async () => { throw new Error('offline') })
    render(<CreditDetail credit={ethics} onUpdate={onUpdate} onRemove={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /edit credit/i }))
    fireEvent.change(screen.getByLabelText(/total hours/i), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /save credit/i }))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent(/couldn.?t save/i)
    expect(screen.getByLabelText(/total hours/i)).toHaveValue('3')
  })

  it('moves focus to the heading when switching into the edit sub-view', () => {
    render(<CreditDetail credit={ethics} onUpdate={vi.fn()} onRemove={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /edit credit/i }))
    expect(screen.getByRole('heading', { name: 'Edit credit' })).toHaveFocus()
  })

  it('moves focus to the heading when switching into the remove-confirm sub-view', () => {
    render(<CreditDetail credit={ethics} onUpdate={vi.fn()} onRemove={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /remove credit/i }))
    expect(screen.getByRole('heading', { name: /remove this credit/i })).toHaveFocus()
  })

  it('asks for confirmation before removing, and Cancel backs out without calling onRemove', () => {
    const onRemove = vi.fn()
    render(<CreditDetail credit={ethics} onUpdate={vi.fn()} onRemove={onRemove} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /remove credit/i }))
    expect(screen.getByText(/remove this credit/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(onRemove).not.toHaveBeenCalled()
    expect(screen.getByText('Ethics in the Age of AI')).toBeInTheDocument()
  })

  it('removes via onRemove once confirmed', () => {
    const onRemove = vi.fn()
    render(<CreditDetail credit={ethics} onUpdate={vi.fn()} onRemove={onRemove} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /remove credit/i }))
    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }))
    expect(onRemove).toHaveBeenCalledWith('1')
  })
})

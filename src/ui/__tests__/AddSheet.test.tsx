// ABOUTME: Verifies the AddSheet action sheet renders Take Photo/Upload/Manual/Cancel, wires the
// ABOUTME: two hidden file inputs correctly, and closes on backdrop/Cancel clicks.
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { AddSheet } from '../AddSheet'

function file() {
  return new File([new Uint8Array([65, 66, 67])], 'cert.pdf', { type: 'application/pdf' })
}

it('renders the three options and Cancel', () => {
  render(<AddSheet onFile={vi.fn()} onManual={vi.fn()} onCancel={vi.fn()} />)
  expect(screen.getByText('Take Photo')).toBeInTheDocument()
  expect(screen.getByText('Upload PDF or Image')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Enter Manually' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
})

it("wires Take Photo's hidden input to device capture", () => {
  render(<AddSheet onFile={vi.fn()} onManual={vi.fn()} onCancel={vi.fn()} />)
  const input = screen.getByLabelText('Take Photo') as HTMLInputElement
  expect(input.accept).toBe('image/*')
  expect(input.getAttribute('capture')).toBe('environment')
})

it("wires Upload's hidden input to accept PDF/images without device capture", () => {
  render(<AddSheet onFile={vi.fn()} onManual={vi.fn()} onCancel={vi.fn()} />)
  const input = screen.getByLabelText('Upload PDF or Image') as HTMLInputElement
  expect(input.accept).toBe('application/pdf,image/png,image/jpeg,image/webp,image/gif')
  expect(input.hasAttribute('capture')).toBe(false)
})

it('reports a file picked via either input through onFile', () => {
  const onFile = vi.fn()
  render(<AddSheet onFile={onFile} onManual={vi.fn()} onCancel={vi.fn()} />)
  const input = screen.getByLabelText('Upload PDF or Image') as HTMLInputElement
  const picked = file()
  fireEvent.change(input, { target: { files: [picked] } })
  expect(onFile).toHaveBeenCalledWith(picked)
})

it('fires onManual for Enter Manually', () => {
  const onManual = vi.fn()
  render(<AddSheet onFile={vi.fn()} onManual={onManual} onCancel={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Enter Manually' }))
  expect(onManual).toHaveBeenCalled()
})

it('fires onCancel on Cancel click and on backdrop click', () => {
  const onCancel = vi.fn()
  const { container } = render(<AddSheet onFile={vi.fn()} onManual={vi.fn()} onCancel={onCancel} />)
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onCancel).toHaveBeenCalledTimes(1)
  fireEvent.click(container.querySelector('.sheet-backdrop')!)
  expect(onCancel).toHaveBeenCalledTimes(2)
})

it('does not close when clicking inside the sheet itself', () => {
  const onCancel = vi.fn()
  const { container } = render(<AddSheet onFile={vi.fn()} onManual={vi.fn()} onCancel={onCancel} />)
  fireEvent.click(container.querySelector('.sheet')!)
  expect(onCancel).not.toHaveBeenCalled()
})

it('shows a busy state and hides the options while busy', () => {
  render(<AddSheet busy onFile={vi.fn()} onManual={vi.fn()} onCancel={vi.fn()} />)
  expect(screen.getByText(/reading/i)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Enter Manually' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
})

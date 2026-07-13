// ABOUTME: Verifies the legal footer renders the copyright line, a mailto Contact link, and
// ABOUTME: Privacy/Terms buttons that fire their open callbacks.
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { LegalFooter } from '../LegalFooter'

it('renders the copyright and a mailto Contact link', () => {
  render(<LegalFooter onOpenPrivacy={() => {}} onOpenTerms={() => {}} />)
  expect(screen.getByText(/© 2026 clekeeper/)).toBeInTheDocument()
  const contact = screen.getByRole('link', { name: /contact/i })
  expect(contact).toHaveAttribute('href', 'mailto:support@turbosloth.org')
})

it('fires onOpenPrivacy and onOpenTerms from their buttons', () => {
  const onOpenPrivacy = vi.fn()
  const onOpenTerms = vi.fn()
  render(<LegalFooter onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />)
  fireEvent.click(screen.getByRole('button', { name: /privacy/i }))
  expect(onOpenPrivacy).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: /terms/i }))
  expect(onOpenTerms).toHaveBeenCalledTimes(1)
})

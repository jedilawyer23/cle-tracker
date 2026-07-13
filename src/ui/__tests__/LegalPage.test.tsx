// ABOUTME: Verifies the Privacy Policy and Terms of Use content screens render their titles,
// ABOUTME: distinctive prose, the "Last updated" line, and a working Back control.
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { PrivacyPolicy } from '../PrivacyPolicy'
import { Terms } from '../Terms'

it('Privacy Policy renders its title, last-updated line, and distinctive prose', () => {
  render(<PrivacyPolicy onBack={() => {}} />)
  expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument()
  expect(screen.getByText(/last updated: july 13, 2026/i)).toBeInTheDocument()
  expect(screen.getByText(/is not stored/i)).toBeInTheDocument()
  expect(screen.getByText(/do not sell/i)).toBeInTheDocument()
})

it('Privacy Policy fires onBack from its Back control', () => {
  const onBack = vi.fn()
  render(<PrivacyPolicy onBack={onBack} />)
  fireEvent.click(screen.getByRole('button', { name: /back/i }))
  expect(onBack).toHaveBeenCalledTimes(1)
})

it('Terms of Use renders its title and distinctive prose', () => {
  render(<Terms onBack={() => {}} />)
  expect(screen.getByRole('heading', { level: 1, name: 'Terms of Use' })).toBeInTheDocument()
  expect(screen.getByText(/last updated: july 13, 2026/i)).toBeInTheDocument()
  expect(screen.getByText(/is not legal advice and is not affiliated/i)).toBeInTheDocument()
  expect(screen.getByText(/provided "as is,"/i)).toBeInTheDocument()
})

it('Terms of Use fires onBack from its Back control', () => {
  const onBack = vi.fn()
  render(<Terms onBack={onBack} />)
  fireEvent.click(screen.getByRole('button', { name: /back/i }))
  expect(onBack).toHaveBeenCalledTimes(1)
})

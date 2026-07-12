// ABOUTME: Verifies the guest "Sign in to save" pill and the linked "whoami" pill (avatar/photo,
// ABOUTME: name, Google mark) — and the optional leading back control for the Confirm header.
import { it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SignInToSave } from '../SignInToSave'

it('renders for a guest and fires onSignIn on click', () => {
  const onSignIn = vi.fn()
  render(<SignInToSave accountState="guest" onSignIn={onSignIn} />)
  fireEvent.click(screen.getByRole('button', { name: /sign in to save/i }))
  expect(onSignIn).toHaveBeenCalled()
})

it('renders the topline spacer without a sign-in button once linked', () => {
  render(<SignInToSave accountState="linked" onSignIn={() => {}} name="Maya Hoffman" />)
  expect(screen.queryByRole('button', { name: /sign in to save/i })).not.toBeInTheDocument()
  expect(document.querySelector('.topline')).toBeInTheDocument()
})

it('shows the whoami pill with the name and initials avatar once linked, with no photoURL', () => {
  render(<SignInToSave accountState="linked" onSignIn={() => {}} name="Maya Hoffman" />)
  expect(screen.getByText('Maya Hoffman')).toBeInTheDocument()
  const avatar = document.querySelector('.avatar')!
  expect(avatar.tagName).toBe('SPAN')
  expect(avatar).toHaveTextContent('MH')
  expect(document.querySelector('.whoami .g')).toBeInTheDocument()
})

it('shows a photo avatar once linked when photoURL is given', () => {
  render(<SignInToSave accountState="linked" onSignIn={() => {}} name="Maya Hoffman" photoURL="https://example.com/p.jpg" />)
  const avatar = document.querySelector('.avatar')!
  expect(avatar.tagName).toBe('IMG')
  expect(avatar).toHaveAttribute('src', 'https://example.com/p.jpg')
})

it('renders an optional leading back control before the spacer, guest state', () => {
  const onBack = vi.fn()
  render(<SignInToSave accountState="guest" onSignIn={() => {}} onBack={onBack} />)
  const topline = document.querySelector('.topline')!
  const backBtn = topline.querySelector('.back')!
  const navBtn = topline.querySelector('.navbtn')!
  expect(backBtn.compareDocumentPosition(navBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  fireEvent.click(backBtn)
  expect(onBack).toHaveBeenCalled()
})

it('omits the back control when onBack is not passed', () => {
  render(<SignInToSave accountState="guest" onSignIn={() => {}} />)
  expect(document.querySelector('.back')).not.toBeInTheDocument()
})

it('shows the leading wordmark when brand is set, before the account pill', () => {
  render(<SignInToSave accountState="guest" onSignIn={() => {}} brand />)
  const topline = document.querySelector('.topline')!
  const brand = topline.querySelector('.brand')!
  const navBtn = topline.querySelector('.navbtn')!
  expect(brand).toHaveTextContent('clekeeper')
  expect(brand.compareDocumentPosition(navBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})

it('omits the wordmark on the back-header variant even if brand is set', () => {
  render(<SignInToSave accountState="guest" onSignIn={() => {}} onBack={() => {}} brand />)
  expect(document.querySelector('.brand')).not.toBeInTheDocument()
  expect(document.querySelector('.back')).toBeInTheDocument()
})

// ABOUTME: Verifies the Sign-in-to-save affordance shows only for guests and fires onSignIn.
// ABOUTME: Presentational component test — no store, no Firebase.
import { it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SignInToSave } from '../SignInToSave'

it('renders for a guest and fires onSignIn on click', () => {
  const onSignIn = vi.fn()
  render(<SignInToSave accountState="guest" onSignIn={onSignIn} />)
  fireEvent.click(screen.getByRole('button', { name: /sign in to save/i }))
  expect(onSignIn).toHaveBeenCalled()
})

it('renders nothing once linked', () => {
  const { container } = render(<SignInToSave accountState="linked" onSignIn={() => {}} />)
  expect(container).toBeEmptyDOMElement()
})

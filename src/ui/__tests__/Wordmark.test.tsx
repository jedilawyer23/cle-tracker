// ABOUTME: Verifies the small brand wordmark renders "clekeeper" with the § legal mark.
import { it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Wordmark } from '../Wordmark'

it('renders the clekeeper wordmark with a § mark', () => {
  render(<Wordmark />)
  const brand = document.querySelector('.brand')!
  expect(brand).toBeInTheDocument()
  expect(brand).toHaveTextContent('clekeeper')
  expect(brand.querySelector('.mk')).toHaveTextContent('§')
})

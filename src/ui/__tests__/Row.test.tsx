// ABOUTME: Verifies Row renders its label and trailing content.
import { render, screen } from '@testing-library/react'
import { Row } from '../Row'

it('renders label and trailing value', () => {
  render(<Row label="Legal Ethics" trailing={<span>4/4</span>} />)
  expect(screen.getByText('Legal Ethics')).toBeInTheDocument()
  expect(screen.getByText('4/4')).toBeInTheDocument()
})

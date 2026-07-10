// ABOUTME: Verifies the Dashboard renders derived requirement rows and the deadline.
import { render, screen } from '@testing-library/react'
import { Dashboard } from '../Dashboard'
import { calculateCompliance } from '../../domain/complianceCalculator'
import { REQUIREMENT_RULES } from '../../domain/requirements'

it('shows the empty requirement with the deadline', () => {
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  render(<Dashboard name="Maya Hoffman" group={2}
    period={{ start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }}
    result={result} />)
  expect(screen.getByText('Legal Ethics')).toBeInTheDocument()
  expect(screen.getByText(/Mar 30, 2027|2027-03-30/)).toBeInTheDocument()
  expect(screen.getByText(/0 \/ 25|0\/25/)).toBeInTheDocument()
})

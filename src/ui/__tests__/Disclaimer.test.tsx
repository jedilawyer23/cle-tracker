// ABOUTME: Verifies the shared Disclaimer component renders the single-source disclaimer text.
// ABOUTME: Presentational only — content correctness is the DISCLAIMER_TEXT constant's job.
import { render, screen } from '@testing-library/react'
import { Disclaimer } from '../Disclaimer'
import { DISCLAIMER_TEXT } from '../../domain/disclaimer'

it('renders the shared disclaimer text as a note', () => {
  const { container } = render(<Disclaimer />)
  expect(screen.getByText(DISCLAIMER_TEXT)).toBeInTheDocument()
  expect(container.querySelector('.note')).toHaveTextContent(DISCLAIMER_TEXT)
})

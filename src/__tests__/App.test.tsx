// ABOUTME: Verifies first-run -> dashboard navigation (persisting the derived profile to the
// ABOUTME: store), adding/removing a credit end to end, and returning-session/sign-in behavior —
// ABOUTME: all against the in-memory fake async Store. No real network/Firebase call is made.
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import App from '../App'
import { createFakeStore } from '../store/fakeStore'
import type { UserProfile } from '../store/types'
import type { Credit } from '../domain/types'

vi.mock('../parsing/parseCertificate', () => ({ parseCertificate: vi.fn() }))
vi.mock('../parsing/fileToBase64', () => ({
  fileToBase64: vi.fn(async () => ({ fileBase64: 'QUJD', mimeType: 'application/pdf' })),
}))
import { parseCertificate } from '../parsing/parseCertificate'

it('shows a loading state before the store is ready', () => {
  render(<App store={createFakeStore()} />)
  expect(screen.getByText(/loading/i)).toBeInTheDocument()
})

it('goes from first run to the dashboard, persisting the derived profile to the store', async () => {
  const store = createFakeStore()
  render(<App store={store} />)
  await screen.findByLabelText(/full name/i)
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Maya Hoffman' } })
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  await waitFor(() => expect(screen.getByText(/Legal Ethics/)).toBeInTheDocument())
  expect(store.getProfile()).toMatchObject({ name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, accountState: 'guest' })
})

it('skips first run for a returning session that already has a saved profile', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'guest',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  render(<App store={createFakeStore({ profile })} today="2026-07-10" />)
  await waitFor(() => expect(screen.getByText(/Legal Ethics/)).toBeInTheDocument())
  expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument()
})

it('opens the add-certificate action sheet from the dashboard and closes it on Cancel', async () => {
  render(<App store={createFakeStore()} today="2026-07-10" />)
  await screen.findByLabelText(/full name/i)
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Maya Hoffman' } })
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  await screen.findByRole('button', { name: /add a certificate/i })
  fireEvent.click(screen.getByRole('button', { name: /add a certificate/i }))

  expect(screen.getByText('Take Photo')).toBeInTheDocument()
  expect(screen.getByText('Upload PDF or Image')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Enter Manually' })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByText('Take Photo')).not.toBeInTheDocument()
})

it('adds a credit from the dashboard via manual entry and reflects it', async () => {
  const store = createFakeStore()
  render(<App store={store} today="2026-07-10" />)
  await screen.findByLabelText(/full name/i)
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Maya Hoffman' } })
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  await screen.findByRole('button', { name: /add a certificate/i })
  fireEvent.click(screen.getByRole('button', { name: /add a certificate/i }))
  // The sheet offers Take Photo/Upload first; Enter Manually reaches the blank form.
  fireEvent.click(screen.getByRole('button', { name: 'Enter Manually' }))
  fireEvent.change(screen.getByLabelText(/provider/i), { target: { value: 'CEB' } })
  fireEvent.change(screen.getByLabelText(/activity title/i), { target: { value: 'Conflicts of Interest' } })
  fireEvent.change(screen.getByLabelText(/completion date/i), { target: { value: '2026-01-22' } })
  fireEvent.change(screen.getByLabelText(/total hours/i), { target: { value: '4' } })
  fireEvent.change(screen.getByLabelText(/^legal ethics$/i), { target: { value: '4' } })
  fireEvent.click(screen.getByRole('button', { name: /save credit/i }))
  await waitFor(() => expect(screen.getByText('Complete')).toBeInTheDocument())
  expect(screen.getByText('Legal Ethics')).toBeInTheDocument()
  expect(store.getCredits()).toHaveLength(1)
})

it('routes a parsed certificate into Confirm with low-confidence fields flagged, then saves it', async () => {
  ;(parseCertificate as ReturnType<typeof vi.fn>).mockResolvedValue({
    provider: 'Practising Law Institute', activityTitle: 'AI and the Practice of Law',
    completionDate: '2026-06-18', totalHours: 1.5, participatory: true,
    categoryHours: { technology: 1, general: 0.5 },
    confidence: {
      provider: 'high', activityTitle: 'high', completionDate: 'high',
      totalHours: 'high', participatory: 'low', categoryHours: 'high',
    },
  })
  render(<App store={createFakeStore()} today="2026-07-10" />)
  await screen.findByLabelText(/full name/i)
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Maya Hoffman' } })
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  await screen.findByRole('button', { name: /add a certificate/i })
  fireEvent.click(screen.getByRole('button', { name: /add a certificate/i }))

  const fileInput = screen.getByLabelText('Upload PDF or Image') as HTMLInputElement
  const file = new File([new Uint8Array([65, 66, 67])], 'cert.pdf', { type: 'application/pdf' })
  fireEvent.change(fileInput, { target: { files: [file] } })

  await waitFor(() => expect(screen.getByLabelText(/^provider$/i)).toHaveValue('Practising Law Institute'))
  expect(screen.getByText(/couldn.?t read — please confirm/i)).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /save credit/i }))
  await waitFor(() => expect(screen.getByText('Complete')).toBeInTheDocument())
  expect(screen.getByText('Technology')).toBeInTheDocument()
})

it('falls back to a blank Confirm screen with a message when parsing fails', async () => {
  ;(parseCertificate as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('unreadable'))
  render(<App store={createFakeStore()} today="2026-07-10" />)
  await screen.findByLabelText(/full name/i)
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Maya Hoffman' } })
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  await screen.findByRole('button', { name: /add a certificate/i })
  fireEvent.click(screen.getByRole('button', { name: /add a certificate/i }))

  const fileInput = screen.getByLabelText('Upload PDF or Image') as HTMLInputElement
  const file = new File([new Uint8Array([65, 66, 67])], 'cert.pdf', { type: 'application/pdf' })
  fireEvent.change(fileInput, { target: { files: [file] } })

  await waitFor(() => expect(screen.getByText(/couldn.?t read that certificate/i)).toBeInTheDocument())
  expect(screen.getByLabelText(/^provider$/i)).toHaveValue('')
})

it('only counts credits completed within the current compliance period', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'guest',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  const credits: Credit[] = [
    { id: 'in', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } },
    { id: 'out', provider: 'CEB', activityTitle: 'Old Ethics Course', completionDate: '2023-05-01', totalHours: 10, participatory: true, categoryHours: { ethics: 10 } },
  ]
  render(<App store={createFakeStore({ profile, credits })} today="2026-07-10" />)
  await waitFor(() => expect(screen.getByText(/of 25 hours logged/i)).toBeInTheDocument())
  expect(screen.getByText(/4 of 25 hours logged/i)).toBeInTheDocument()
  expect(screen.queryByText(/Old Ethics Course/)).not.toBeInTheDocument()
})

it('shows "Sign in to save" for a guest and hides it once linked', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'guest',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  const credits: Credit[] = [{
    id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22',
    totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
  }]
  const onLinkGoogle = vi.fn(async () => ({ kind: 'linked' as const }))
  render(
    <App store={createFakeStore({ profile, credits })} today="2026-07-10" onLinkGoogle={onLinkGoogle} />,
  )
  await screen.findByRole('button', { name: /sign in to save/i })
  fireEvent.click(screen.getByRole('button', { name: /sign in to save/i }))
  expect(onLinkGoogle).toHaveBeenCalled()
  await waitFor(() => expect(screen.queryByRole('button', { name: /sign in to save/i })).not.toBeInTheDocument())
  expect(screen.getByText(/saved to your google account/i)).toBeInTheDocument()
})

it('leaves the UI unchanged and shows no message when sign-in is cancelled', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'guest',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  const onLinkGoogle = vi.fn(async () => ({ kind: 'cancelled' as const }))
  render(
    <App store={createFakeStore({ profile })} today="2026-07-10" onLinkGoogle={onLinkGoogle} />,
  )
  const button = await screen.findByRole('button', { name: /sign in to save/i })
  fireEvent.click(button)
  await waitFor(() => expect(onLinkGoogle).toHaveBeenCalled())
  expect(screen.queryByText(/couldn.?t sign in/i)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /sign in to save/i })).toBeInTheDocument()
})

it('does not clear an existing sign-in message when a later attempt is cancelled', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'guest',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  const onLinkGoogle = vi.fn()
    .mockResolvedValueOnce({ kind: 'error' as const, code: 'auth/network-request-failed' })
    .mockResolvedValueOnce({ kind: 'cancelled' as const })
  render(
    <App store={createFakeStore({ profile })} today="2026-07-10" onLinkGoogle={onLinkGoogle} />,
  )
  const button = await screen.findByRole('button', { name: /sign in to save/i })
  fireEvent.click(button)
  await screen.findByText(/couldn.?t sign in — please try again/i)

  fireEvent.click(button)
  await waitFor(() => expect(onLinkGoogle).toHaveBeenCalledTimes(2))
  expect(screen.getByText(/couldn.?t sign in — please try again/i)).toBeInTheDocument()
})

it('renders "Sign in to save" inside the content wrap, not as a bare sibling', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'guest',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  render(<App store={createFakeStore({ profile })} today="2026-07-10" />)
  const button = await screen.findByRole('button', { name: /sign in to save/i })
  expect(button.closest('.wrap')).not.toBeNull()
})

it('renders "Sign in to save" inside the Confirm screen wrap, next to the back control', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'guest',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  render(<App store={createFakeStore({ profile })} today="2026-07-10" />)
  await screen.findByRole('button', { name: /add a certificate/i })
  fireEvent.click(screen.getByRole('button', { name: /add a certificate/i }))
  fireEvent.click(screen.getByRole('button', { name: 'Enter Manually' }))
  const button = await screen.findByRole('button', { name: /sign in to save/i })
  expect(button.closest('.wrap')).not.toBeNull()
  expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
})

it('navigates dashboard -> Past cycles -> a past credit\'s detail screen', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'guest',
    // Group 2's second calendar cycle is current; the first cycle is now "past".
    currentPeriod: { start: '2027-02-01', end: '2030-03-29', reportBy: '2030-03-30' },
    requirementsVersion: '2026-07-10',
  }
  const credits: Credit[] = [
    { id: 'cur', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2027-06-01', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } },
    { id: 'past', provider: 'PLI', activityTitle: 'Old Ethics Course', completionDate: '2026-01-22', totalHours: 10, participatory: true, categoryHours: { ethics: 10 } },
  ]
  render(<App store={createFakeStore({ profile, credits })} today="2026-07-10" />)
  await waitFor(() => expect(screen.getByText(/of 25 hours logged/i)).toBeInTheDocument())

  const pastLink = screen.getByText(/past cycles/i)
  fireEvent.click(pastLink)

  expect(await screen.findByText('Past cycles')).toBeInTheDocument()
  expect(screen.getByText('Old Ethics Course')).toBeInTheDocument()
  expect(screen.queryByText('Conflicts of Interest')).not.toBeInTheDocument()

  fireEvent.click(screen.getByText('Old Ethics Course'))
  expect(await screen.findByRole('heading', { name: 'Old Ethics Course' })).toBeInTheDocument()
  expect(screen.getByText(/PLI/)).toBeInTheDocument()
})

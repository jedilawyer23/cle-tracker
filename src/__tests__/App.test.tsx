// ABOUTME: Verifies first-run -> dashboard navigation (persisting the derived profile to the
// ABOUTME: store), adding/removing a credit end to end, and returning-session/sign-in behavior —
// ABOUTME: all against the in-memory fake async Store. No real network/Firebase call is made.
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import App from '../App'
import { createFakeStore } from '../store/fakeStore'
import type { Store, UserProfile } from '../store/types'
import type { Credit } from '../domain/types'

vi.mock('../parsing/parseCertificate', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../parsing/parseCertificate')>()),
  parseCertificate: vi.fn(), // keep the real NotACleCertificateError class, mock only the call
}))
vi.mock('../parsing/fileToBase64', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../parsing/fileToBase64')>()), // keep the real size cap/check
  fileToBase64: vi.fn(async () => ({ fileBase64: 'QUJD', mimeType: 'application/pdf' })),
}))
import { parseCertificate } from '../parsing/parseCertificate'

it('shows a loading state before the store is ready, announced via a live region', () => {
  render(<App store={createFakeStore()} />)
  const status = screen.getByRole('status')
  expect(status).toHaveTextContent(/loading/i)
  expect(status).toHaveAttribute('aria-live')
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
  await waitFor(() => expect(screen.getByText(/requirements left/i)).toBeInTheDocument())
  const ethicsRow = screen.getByText('Legal Ethics').closest('.item')!
  expect(ethicsRow.querySelector('.chkcol .ck')).toBeInTheDocument()
  expect(store.getCredits()).toHaveLength(1)
})

it('does not add a duplicate certificate a second time, and shows a notice — but a genuinely new one still saves', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'guest',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  const credits: Credit[] = [
    { id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } },
  ]
  const store = createFakeStore({ profile, credits })
  render(<App store={store} today="2026-07-10" />)
  await waitFor(() => expect(screen.getByText(/of 25 hours logged/i)).toBeInTheDocument())

  // Re-enter the exact same certificate (same provider/title/date/hours/type/breakdown, just
  // different casing/whitespace) via manual entry.
  fireEvent.click(screen.getByRole('button', { name: /add a certificate/i }))
  fireEvent.click(screen.getByRole('button', { name: 'Enter Manually' }))
  fireEvent.change(screen.getByLabelText(/provider/i), { target: { value: ' ceb ' } })
  fireEvent.change(screen.getByLabelText(/activity title/i), { target: { value: 'CONFLICTS OF INTEREST' } })
  fireEvent.change(screen.getByLabelText(/completion date/i), { target: { value: '2026-01-22' } })
  fireEvent.change(screen.getByLabelText(/total hours/i), { target: { value: '4' } })
  fireEvent.change(screen.getByLabelText(/^legal ethics$/i), { target: { value: '4' } })
  fireEvent.click(screen.getByRole('button', { name: /save credit/i }))

  await waitFor(() => expect(screen.getByText(/already logged/i)).toBeInTheDocument())
  expect(store.getCredits()).toHaveLength(1)

  // A genuinely different certificate still saves normally, and the notice doesn't linger.
  fireEvent.click(screen.getByRole('button', { name: /add a certificate/i }))
  fireEvent.click(screen.getByRole('button', { name: 'Enter Manually' }))
  fireEvent.change(screen.getByLabelText(/provider/i), { target: { value: 'PLI' } })
  fireEvent.change(screen.getByLabelText(/activity title/i), { target: { value: 'AI and the Practice of Law' } })
  fireEvent.change(screen.getByLabelText(/completion date/i), { target: { value: '2026-06-18' } })
  fireEvent.change(screen.getByLabelText(/total hours/i), { target: { value: '1.5' } })
  fireEvent.change(screen.getByLabelText(/^technology$/i), { target: { value: '1.5' } })
  fireEvent.click(screen.getByRole('button', { name: /save credit/i }))

  await waitFor(() => expect(store.getCredits()).toHaveLength(2))
  expect(screen.queryByText(/already logged/i)).not.toBeInTheDocument()
})

it('shows a toast and stays on Confirm (without saving) when adding a credit fails', async () => {
  const store = createFakeStore()
  vi.spyOn(store, 'addCredit').mockRejectedValue(new Error('offline'))
  render(<App store={store} today="2026-07-10" />)
  await screen.findByLabelText(/full name/i)
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Maya Hoffman' } })
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  await screen.findByRole('button', { name: /add a certificate/i })
  fireEvent.click(screen.getByRole('button', { name: /add a certificate/i }))
  fireEvent.click(screen.getByRole('button', { name: 'Enter Manually' }))
  fireEvent.change(screen.getByLabelText(/provider/i), { target: { value: 'CEB' } })
  fireEvent.change(screen.getByLabelText(/activity title/i), { target: { value: 'Conflicts of Interest' } })
  fireEvent.change(screen.getByLabelText(/completion date/i), { target: { value: '2026-01-22' } })
  fireEvent.change(screen.getByLabelText(/total hours/i), { target: { value: '4' } })
  fireEvent.change(screen.getByLabelText(/^legal ethics$/i), { target: { value: '4' } })
  fireEvent.click(screen.getByRole('button', { name: /save credit/i }))

  const status = await screen.findByRole('status')
  expect(status).toHaveTextContent(/couldn.?t save/i)
  expect(screen.queryByText(/requirements left/i)).not.toBeInTheDocument()
  expect(screen.getByLabelText(/provider/i)).toHaveValue('CEB')
  expect(store.getCredits()).toHaveLength(0)
})

it('shows a toast and does not navigate to the dashboard when removing a credit fails', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'guest',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  const credits: Credit[] = [
    { id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } },
  ]
  const store = createFakeStore({ profile, credits })
  vi.spyOn(store, 'removeCredit').mockRejectedValue(new Error('offline'))
  render(<App store={store} today="2026-07-10" />)
  await waitFor(() => expect(screen.getByText(/of 25 hours logged/i)).toBeInTheDocument())

  fireEvent.click(screen.getByText('Conflicts of Interest'))
  await screen.findByRole('button', { name: /remove credit/i })
  fireEvent.click(screen.getByRole('button', { name: /remove credit/i }))
  fireEvent.click(screen.getByRole('button', { name: /^remove$/i }))

  const status = await screen.findByRole('status')
  expect(status).toHaveTextContent(/couldn.?t remove/i)
  expect(screen.queryByText(/requirements left/i)).not.toBeInTheDocument()
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
  await waitFor(() => expect(screen.getByText(/requirements left/i)).toBeInTheDocument())
  const technologyRow = screen.getByText('Technology').closest('.item')!
  expect(technologyRow.querySelector('.chkcol .ck')).toBeInTheDocument()
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
  // Once linked, the header shows the whoami pill with the profile's name instead of the button.
  expect(screen.getByText('Maya Hoffman')).toBeInTheDocument()
})

it('threads the photoURL prop into the signed-in header avatar', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'linked',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  render(<App store={createFakeStore({ profile })} today="2026-07-10" photoURL="https://example.com/p.jpg" />)
  await screen.findByText('Maya Hoffman')
  const avatar = document.querySelector('.avatar')!
  expect(avatar.tagName).toBe('IMG')
  expect(avatar).toHaveAttribute('src', 'https://example.com/p.jpg')
})

it('on use-existing-account: flips to linked, shows the merged-credits message, and reloads', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'guest',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  const onLinkGoogle = vi.fn(async () => ({ kind: 'use-existing-account' as const }))
  const reload = vi.fn()
  render(
    <App
      store={createFakeStore({ profile })}
      today="2026-07-10"
      onLinkGoogle={onLinkGoogle}
      reload={reload}
    />,
  )
  const button = await screen.findByRole('button', { name: /sign in to save/i })
  fireEvent.click(button)
  await waitFor(() => expect(screen.queryByRole('button', { name: /sign in to save/i })).not.toBeInTheDocument())
  expect(screen.getByText(/signed in.*credits were saved to your account/i)).toBeInTheDocument()
  expect(reload).toHaveBeenCalledTimes(1)
})

it('on linked: flips to linked but does not reload (the live store subscription already reflects it)', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'guest',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  const onLinkGoogle = vi.fn(async () => ({ kind: 'linked' as const }))
  const reload = vi.fn()
  render(
    <App
      store={createFakeStore({ profile })}
      today="2026-07-10"
      onLinkGoogle={onLinkGoogle}
      reload={reload}
    />,
  )
  const button = await screen.findByRole('button', { name: /sign in to save/i })
  fireEvent.click(button)
  await waitFor(() => expect(screen.queryByRole('button', { name: /sign in to save/i })).not.toBeInTheDocument())
  expect(screen.getByText(/saved to your google account/i)).toBeInTheDocument()
  expect(reload).not.toHaveBeenCalled()
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
  // `today` must actually fall inside the stored (second) cycle — App now re-derives and
  // migrates the current period to whichever cycle contains `today` (see the migration test above).
  render(<App store={createFakeStore({ profile, credits })} today="2027-06-01" />)
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

it('moves focus to the dashboard heading once first-run onboarding completes', async () => {
  render(<App store={createFakeStore()} today="2026-07-10" />)
  await screen.findByLabelText(/full name/i)
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Maya Hoffman' } })
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  await waitFor(() => expect(screen.getByText(/Legal Ethics/)).toBeInTheDocument())
  expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()
})

it('moves focus to the new screen\'s heading when navigating to Settings', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'guest',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  render(<App store={createFakeStore({ profile })} today="2026-07-10" />)
  await screen.findByRole('button', { name: /settings/i })
  fireEvent.click(screen.getByRole('button', { name: /settings/i }))
  const heading = await screen.findByRole('heading', { name: 'Settings' })
  expect(heading).toHaveFocus()
})

it('does not steal focus from a form field being typed into (no screen change)', async () => {
  render(<App store={createFakeStore()} today="2026-07-10" />)
  const nameField = await screen.findByLabelText(/full name/i)
  nameField.focus()
  fireEvent.change(nameField, { target: { value: 'Maya' } })
  expect(nameField).toHaveFocus()
  fireEvent.change(nameField, { target: { value: 'Maya Hoffman' } })
  expect(nameField).toHaveFocus()
})

it('opens the Settings menu from the dashboard gear (not straight to name-edit), and Edit name still works', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: '2010-01-01',
    accountState: 'linked',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  const store = createFakeStore({ profile })
  render(<App store={store} today="2026-07-10" />)
  await screen.findByText('Maya Hoffman')

  fireEvent.click(screen.getByRole('button', { name: /settings/i }))
  expect(await screen.findByText('Settings')).toBeInTheDocument()
  expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument()

  fireEvent.click(screen.getByText('Edit name'))
  expect(await screen.findByText('Edit name')).toBeInTheDocument()
  expect(screen.getByLabelText(/full name/i)).toHaveValue('Maya Hoffman')

  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alice Adams' } })
  fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

  await waitFor(() => expect(screen.getByText('Alice Adams')).toBeInTheDocument())
  expect(screen.queryByText('Edit name')).not.toBeInTheDocument()
  expect(store.getProfile()).toMatchObject({
    name: 'Alice Adams',
    lastName: 'Adams',
    group: 1,
    currentPeriod: { start: '2025-02-01', end: '2028-03-29', reportBy: '2028-03-30' },
    accountState: 'linked',
    admissionDate: '2010-01-01',
    requirementsVersion: '2026-07-10',
  })
})

it('migrates a stale stored currentPeriod forward to the cycle containing today, on load', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'guest',
    // Stored during the 2024-2027 cycle, which has since ended — group 2's calendar has a
    // newer cycle (2027-2030) that actually contains `today` below.
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  const store = createFakeStore({ profile })
  render(<App store={store} today="2027-06-01" />)
  await waitFor(() => expect(store.getProfile()?.currentPeriod).toEqual(
    { start: '2027-02-01', end: '2030-03-29', reportBy: '2030-03-30' },
  ))
  expect(screen.getByText(/report by.*Mar 30, 2030/i)).toBeInTheDocument()
})

it('does not rewrite the profile when the stored currentPeriod already contains today', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'guest',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  const store = createFakeStore({ profile })
  const saveProfile = vi.spyOn(store, 'saveProfile')
  render(<App store={store} today="2026-07-10" />)
  await waitFor(() => expect(screen.getByText(/Legal Ethics/)).toBeInTheDocument())
  expect(saveProfile).not.toHaveBeenCalled()
})

it('returns to the Settings menu from the edit-name screen via Back, without saving changes, and to the dashboard from there', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'guest',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  const store = createFakeStore({ profile })
  render(<App store={store} today="2026-07-10" />)
  await screen.findByRole('button', { name: /settings/i })

  fireEvent.click(screen.getByRole('button', { name: /settings/i }))
  fireEvent.click(await screen.findByText('Edit name'))
  expect(await screen.findByLabelText(/full name/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /back/i }))

  expect(await screen.findByText('Settings')).toBeInTheDocument()
  expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /back/i }))
  await waitFor(() => expect(screen.queryByText('Settings')).not.toBeInTheDocument())
  expect(store.getProfile()).toMatchObject({ name: 'Maya Hoffman', group: 2 })
})

it('Settings: Export builds and downloads a CSV of all logged credits', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'guest',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  const credits: Credit[] = [
    { id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } },
  ]
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  render(<App store={createFakeStore({ profile, credits })} today="2026-07-10" />)
  await waitFor(() => expect(screen.getByText(/of 25 hours logged/i)).toBeInTheDocument())

  fireEvent.click(screen.getByRole('button', { name: /settings/i }))
  fireEvent.click(await screen.findByText('Export my credits'))

  expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
  expect(clickSpy).toHaveBeenCalledTimes(1)
})

it('Settings: hides Export when there are no credits yet', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'guest',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  render(<App store={createFakeStore({ profile })} today="2026-07-10" />)
  await screen.findByRole('button', { name: /settings/i })

  fireEvent.click(screen.getByRole('button', { name: /settings/i }))
  await screen.findByText('Settings')
  expect(screen.queryByText('Export my credits')).not.toBeInTheDocument()
})

it('Settings: Sign out is shown only once linked, and calls onSignOut', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'linked',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  const onSignOut = vi.fn(async () => {})
  render(<App store={createFakeStore({ profile })} today="2026-07-10" onSignOut={onSignOut} />)
  await screen.findByText('Maya Hoffman')

  fireEvent.click(screen.getByRole('button', { name: /settings/i }))
  fireEvent.click(await screen.findByText('Sign out'))
  expect(onSignOut).toHaveBeenCalledTimes(1)
})

it('Settings: Sign out is hidden for a guest — there is no account to sign out of', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'guest',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  render(<App store={createFakeStore({ profile })} today="2026-07-10" />)
  await screen.findByRole('button', { name: /settings/i })

  fireEvent.click(screen.getByRole('button', { name: /settings/i }))
  await screen.findByText('Settings')
  expect(screen.queryByText('Sign out')).not.toBeInTheDocument()
})

it('Settings: a failed sign-out surfaces an error instead of failing silently', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'linked',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  const onSignOut = vi.fn(async () => { throw new Error('network down') })
  render(<App store={createFakeStore({ profile })} today="2026-07-10" onSignOut={onSignOut} />)
  await screen.findByText('Maya Hoffman')

  fireEvent.click(screen.getByRole('button', { name: /settings/i }))
  fireEvent.click(await screen.findByText('Sign out'))

  expect(onSignOut).toHaveBeenCalledTimes(1)
  await screen.findByText(/couldn.?t sign out/i)
})

it('Settings: Delete account & data goes to a confirmation screen, and confirming calls onDeleteAccount with a busy state', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'guest',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  const credits: Credit[] = [
    { id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } },
  ]
  const onDeleteAccount = vi.fn(() => new Promise<void>(() => {})) // never resolves — asserts the busy state
  render(<App store={createFakeStore({ profile, credits })} today="2026-07-10" onDeleteAccount={onDeleteAccount} />)
  await waitFor(() => expect(screen.getByText(/of 25 hours logged/i)).toBeInTheDocument())

  fireEvent.click(screen.getByRole('button', { name: /settings/i }))
  fireEvent.click(await screen.findByText('Delete account & data'))
  expect(await screen.findByText(/permanently deletes your profile and all 1 logged credit/i)).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /delete account/i }))
  expect(onDeleteAccount).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled()
})

it('Settings: a failed delete surfaces an error instead of failing silently, and re-enables the Delete control', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'guest',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  const onDeleteAccount = vi.fn(async () => { throw new Error("Couldn't delete your account — please try again.") })
  render(<App store={createFakeStore({ profile })} today="2026-07-10" onDeleteAccount={onDeleteAccount} />)
  await screen.findByRole('button', { name: /settings/i })

  fireEvent.click(screen.getByRole('button', { name: /settings/i }))
  fireEvent.click(await screen.findByText('Delete account & data'))
  fireEvent.click(screen.getByRole('button', { name: /delete account/i }))

  await screen.findByText(/couldn.?t delete your account/i)
  expect(screen.getByRole('button', { name: /delete account/i })).not.toBeDisabled()
})

it('Settings: Cancel from the delete confirmation returns to the Settings menu without deleting', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'guest',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  const onDeleteAccount = vi.fn(async () => {})
  render(<App store={createFakeStore({ profile })} today="2026-07-10" onDeleteAccount={onDeleteAccount} />)
  await screen.findByRole('button', { name: /settings/i })

  fireEvent.click(screen.getByRole('button', { name: /settings/i }))
  fireEvent.click(await screen.findByText('Delete account & data'))
  fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))

  expect(await screen.findByText('Settings')).toBeInTheDocument()
  expect(onDeleteAccount).not.toHaveBeenCalled()
})

// A real Store (FirestoreStore) has a live subscription on the profile doc, which fires with
// profile=null the instant deleteAccountData removes it — before onDeleteAccount's own deleteUser
// + reload finish. createFakeStore's saveProfile can't express "the profile doc disappeared out
// from under the app," so this test uses a small store double that can simulate exactly that.
function storeThatCanLoseItsProfile(profile: UserProfile): Store & { simulateProfileDeleted: () => void } {
  let current: UserProfile | null = profile
  const listeners = new Set<() => void>()
  return {
    async ready() {},
    getProfile: () => current,
    getCredits: () => [],
    async saveProfile(p) { current = p; listeners.forEach(l => l()) },
    async addCredit() {},
    async updateCredit() {},
    async removeCredit() {},
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    simulateProfileDeleted() {
      current = null
      listeners.forEach(l => l())
    },
  }
}

it('Settings: does not fall back to onboarding while a delete is in flight, even once the profile doc is gone', async () => {
  const profile: UserProfile = {
    name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
    accountState: 'guest',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }
  const store = storeThatCanLoseItsProfile(profile)
  // Mimics deleteAccount.ts: the data (including the profile doc) is gone before onDeleteAccount
  // resolves — deleteUser()+reload() are still pending in the real implementation.
  const onDeleteAccount = vi.fn(() => {
    store.simulateProfileDeleted()
    return new Promise<void>(() => {})
  })
  render(<App store={store} today="2026-07-10" onDeleteAccount={onDeleteAccount} />)
  await screen.findByRole('button', { name: /settings/i })

  fireEvent.click(screen.getByRole('button', { name: /settings/i }))
  fireEvent.click(await screen.findByText('Delete account & data'))
  fireEvent.click(screen.getByRole('button', { name: /delete account/i }))

  await waitFor(() => expect(onDeleteAccount).toHaveBeenCalledTimes(1))
  // Once the profile doc is gone, App must keep showing the busy delete screen — not bounce to
  // the "Get started" onboarding flow, which would flash confusingly right before the reload.
  expect(screen.getByRole('button', { name: /deleting/i })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument()
  expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument()
})

// ABOUTME: Tests the batch review screen — parsed rows with category chips, within/against-batch
// ABOUTME: duplicate flagging, the skipped/error/limit sections, guest vs signed-in copy, and save.
import { it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { BulkItem } from '../../parsing/bulkParseTypes'
import type { Credit, ParsedCredit } from '../../domain/types'

// The hook and the quota callable are mocked so tests can feed controlled items with no real
// network — BatchReview's own logic (dedup, chips, section split, save payload) is what's exercised.
let mockItems: BulkItem[] = []
const mockRun = vi.fn()
vi.mock('../../parsing/useBulkParse', () => ({
  useBulkParse: () => ({ items: mockItems, run: mockRun }),
}))
vi.mock('../../parsing/getParseQuota', () => ({
  getParseQuota: vi.fn(async () => ({ used: 8, limit: 10, remaining: 2 })),
}))

import { BatchReview } from '../BatchReview'

const allHigh = {
  provider: 'high', activityTitle: 'high', completionDate: 'high',
  totalHours: 'high', participatory: 'high', categoryHours: 'high',
} as ParsedCredit['confidence']

function parsedCredit(over: Partial<ParsedCredit> = {}): ParsedCredit {
  return {
    provider: 'PLI', activityTitle: 'AI Law', completionDate: '2026-06-18',
    totalHours: 1.5, participatory: true, categoryHours: { technology: 1.5 },
    confidence: allHigh, ...over,
  }
}

function item(over: Partial<BulkItem> = {}): BulkItem {
  return { id: 'i1', fileName: 'cert.pdf', status: 'parsed', parsed: parsedCredit(), ...over }
}

const noop = () => {}
type SaveFn = (credits: Array<Omit<Credit, 'id'>>) => Promise<void>
const saveMock = () => vi.fn<SaveFn>(async () => {})
async function renderReview(props: Partial<React.ComponentProps<typeof BatchReview>> = {}) {
  const utils = render(
    <BatchReview
      files={[new File([new Uint8Array([1])], 'cert.pdf')]}
      existingCredits={[]}
      isGuest
      onSave={vi.fn(async () => {})}
      onBack={noop}
      onDone={vi.fn()}
      {...props}
    />,
  )
  // Let the getParseQuota microtask settle inside act so its setState never warns.
  await screen.findByText(/left today/i)
  return utils
}

beforeEach(() => {
  mockItems = []
  mockRun.mockClear()
})

it('starts the parse for the passed-in files on mount', async () => {
  const files = [new File([new Uint8Array([1])], 'a.pdf')]
  render(<BatchReview files={files} existingCredits={[]} isGuest onSave={vi.fn()} onBack={noop} onDone={noop} />)
  await waitFor(() => expect(mockRun).toHaveBeenCalledWith(files))
})

it('renders a parsed item with its category chips and total hours', async () => {
  mockItems = [item({ parsed: parsedCredit({ provider: 'CEB', activityTitle: 'Ethics Basics', totalHours: 1, categoryHours: { ethics: 1 } }) })]
  await renderReview()
  expect(screen.getByText('CEB')).toBeInTheDocument()
  expect(screen.getByText('Ethics Basics')).toBeInTheDocument()
  expect(screen.getByText(/Legal Ethics 1\.0/)).toBeInTheDocument()
  expect(screen.getByText('1.0h')).toBeInTheDocument()
})

it('renders a muted General chip for general hours', async () => {
  mockItems = [item({ parsed: parsedCredit({ categoryHours: { competence: 1, general: 2 } }) })]
  await renderReview()
  expect(screen.getByText(/Competence 1\.0/)).toBeInTheDocument()
  expect(screen.getByText(/General 2\.0/)).toBeInTheDocument()
})

it('flags a duplicate of an existing credit and excludes it from the save', async () => {
  const existing: Credit = {
    id: 'x', provider: 'PLI', activityTitle: 'AI Law', completionDate: '2026-06-18',
    totalHours: 1.5, participatory: true, categoryHours: { technology: 1.5 },
  }
  mockItems = [
    item({ id: 'dup', parsed: parsedCredit() }),
    item({ id: 'keep', parsed: parsedCredit({ provider: 'CEB', activityTitle: 'Trusts', categoryHours: { competence: 1 } }) }),
  ]
  const onSave = saveMock()
  await renderReview({ existingCredits: [existing], onSave })
  expect(screen.getByText(/duplicate — won't save twice/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /save 1 credit/i }))
  await waitFor(() => expect(onSave).toHaveBeenCalled())
  const saved = onSave.mock.calls[0][0]
  expect(saved).toHaveLength(1)
  expect(saved[0]).toMatchObject({ provider: 'CEB' })
})

it('flags a second identical item within the same batch as a duplicate', async () => {
  mockItems = [
    item({ id: 'a', parsed: parsedCredit() }),
    item({ id: 'b', parsed: parsedCredit() }),
  ]
  const onSave = saveMock()
  await renderReview({ onSave })
  expect(screen.getByText(/duplicate — won't save twice/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /save 1 credit/i }))
  await waitFor(() => expect(onSave).toHaveBeenCalled())
  expect(onSave.mock.calls[0][0]).toHaveLength(1)
})

it('lists skipped and error files under "Couldn\'t use" with their reasons', async () => {
  mockItems = [
    item({ id: 's', fileName: 'receipt.pdf', status: 'skipped', parsed: undefined }),
    item({ id: 'e', fileName: 'scan.jpg', status: 'error', parsed: undefined, error: "We couldn't read that certificate." }),
  ]
  await renderReview()
  expect(screen.getByText(/couldn't use/i)).toBeInTheDocument()
  expect(screen.getByText(/didn't look like a CLE certificate/i)).toBeInTheDocument()
  expect(screen.getByText(/we couldn't read that certificate/i)).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: /enter manually/i }).length).toBeGreaterThan(0)
})

it('shows the guest banner and limit-stop copy for a guest', async () => {
  mockItems = [item(), item({ id: 'l', fileName: 'over.pdf', status: 'limit', parsed: undefined })]
  await renderReview({ isGuest: true })
  expect(screen.getByText(/10 certificates a day · 2 left today/i)).toBeInTheDocument()
  expect(screen.getByText(/sign in with google for 25\./i)).toBeInTheDocument()
  expect(screen.getByText(/that's your 10 for today/i)).toBeInTheDocument()
  expect(screen.getByText(/sign in with google for 25 a day/i)).toBeInTheDocument()
})

it('shows the signed-in banner and limit-stop copy without a sign-in nudge', async () => {
  mockItems = [item(), item({ id: 'l', fileName: 'over.pdf', status: 'limit', parsed: undefined })]
  await renderReview({ isGuest: false })
  expect(screen.getByText(/25 certificates a day · 2 left today/i)).toBeInTheDocument()
  expect(screen.queryByText(/sign in with google/i)).not.toBeInTheDocument()
  expect(screen.getByText(/that's your 25 for today/i)).toBeInTheDocument()
  expect(screen.getByText(/add the rest tomorrow/i)).toBeInTheDocument()
})

it('saves the accepted credits then calls onDone', async () => {
  mockItems = [
    item({ id: 'a', parsed: parsedCredit({ provider: 'PLI', categoryHours: { technology: 1.5 } }) }),
    item({ id: 'b', parsed: parsedCredit({ provider: 'CEB', activityTitle: 'Trusts', categoryHours: { competence: 1 } }) }),
  ]
  const onSave = saveMock()
  const onDone = vi.fn()
  await renderReview({ onSave, onDone })
  fireEvent.click(screen.getByRole('button', { name: /save 2 credits/i }))
  await waitFor(() => expect(onDone).toHaveBeenCalled())
  const saved = onSave.mock.calls[0][0]
  expect(saved).toHaveLength(2)
  expect(saved.map((c: Omit<Credit, 'id'>) => c.provider).sort()).toEqual(['CEB', 'PLI'])
})

it('persists a row edit into what gets saved', async () => {
  mockItems = [item({ id: 'a', parsed: parsedCredit({ totalHours: 1.5 }) })]
  const onSave = saveMock()
  await renderReview({ onSave })
  fireEvent.click(screen.getByRole('button', { name: /edit pli/i }))
  fireEvent.change(screen.getByLabelText(/total hours/i), { target: { value: '2' } })
  fireEvent.click(screen.getByRole('button', { name: /save credit/i }))
  fireEvent.click(await screen.findByRole('button', { name: /save 1 credit/i }))
  await waitFor(() => expect(onSave).toHaveBeenCalled())
  expect(onSave.mock.calls[0][0][0]).toMatchObject({ totalHours: 2 })
})

it('lets a "Couldn\'t use" file be entered manually and moves it into the save', async () => {
  mockItems = [item({ id: 's', fileName: 'receipt.pdf', status: 'skipped', parsed: undefined })]
  const onSave = saveMock()
  await renderReview({ onSave })
  expect(screen.queryByRole('button', { name: /save 1 credit/i })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /enter manually/i }))
  fireEvent.change(screen.getByLabelText(/^provider$/i), { target: { value: 'Manual Co' } })
  fireEvent.change(screen.getByLabelText(/activity title/i), { target: { value: 'Ethics' } })
  fireEvent.change(screen.getByLabelText(/completion date/i), { target: { value: '2026-05-01' } })
  fireEvent.change(screen.getByLabelText(/total hours/i), { target: { value: '1' } })
  fireEvent.click(screen.getByRole('button', { name: /save credit/i }))
  fireEvent.click(await screen.findByRole('button', { name: /save 1 credit/i }))
  await waitFor(() => expect(onSave).toHaveBeenCalled())
  expect(onSave.mock.calls[0][0][0]).toMatchObject({ provider: 'Manual Co', totalHours: 1 })
})

it('surfaces a toast and keeps the button enabled when the save fails', async () => {
  mockItems = [item({ id: 'a' })]
  const onSave = vi.fn<SaveFn>(async () => { throw new Error('offline') })
  await renderReview({ onSave })
  fireEvent.click(screen.getByRole('button', { name: /save 1 credit/i }))
  expect(await screen.findByText(/couldn't save/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /save 1 credit/i })).toBeEnabled()
})

it('shows a reading state while files are still parsing', async () => {
  mockItems = [item({ id: 'a' }), item({ id: 'b', status: 'parsing', parsed: undefined })]
  await renderReview()
  expect(screen.getByText(/reading certificates/i)).toBeInTheDocument()
})

it('tolerates a failed quota fetch by omitting the count', async () => {
  const { getParseQuota } = await import('../../parsing/getParseQuota')
  ;(getParseQuota as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('offline'))
  mockItems = [item()]
  render(<BatchReview files={[]} existingCredits={[]} isGuest onSave={vi.fn()} onBack={noop} onDone={noop} />)
  await waitFor(() => expect(getParseQuota).toHaveBeenCalled())
  expect(screen.getByText(/10 certificates a day/i)).toBeInTheDocument()
  expect(screen.queryByText(/left today/i)).not.toBeInTheDocument()
})

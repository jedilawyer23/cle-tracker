// ABOUTME: Batch review screen — parses a picked set of certificate files, then lets the user
// ABOUTME: review/edit each read credit, drops duplicates, and saves the accepted batch at once.
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { Credit, ParsedCredit } from '../domain/types'
import { creditSignature, isDuplicateCredit } from '../domain/creditSignature'
import { useBulkParse } from '../parsing/useBulkParse'
import { getParseQuota } from '../parsing/getParseQuota'
import type { BulkItem } from '../parsing/bulkParseTypes'
import { CreditForm, type FlaggableField } from './CreditForm'
import { creditToForm, formToCredit, CATEGORY_LABELS, FORM_CATEGORIES } from './creditFormValues'
import { ToastView } from './ToastView'

export interface BatchReviewProps {
  files: File[]
  existingCredits: Credit[]
  isGuest: boolean
  onSave: (credits: Array<Omit<Credit, 'id'>>) => Promise<void>
  onBack: () => void
  onDone: () => void
}

const CONFIRMED: ParsedCredit['confidence'] = {
  provider: 'high', activityTitle: 'high', completionDate: 'high',
  totalHours: 'high', participatory: 'high', categoryHours: 'high',
}

// The identifying Credit fields of a parsed draft, without the parse-only confidence block.
function parsedToDraft(p: ParsedCredit): Omit<Credit, 'id'> {
  return {
    provider: p.provider, activityTitle: p.activityTitle, completionDate: p.completionDate,
    totalHours: p.totalHours, participatory: p.participatory, categoryHours: p.categoryHours,
  }
}

// Run a parsed draft through the same form normalization a manual save uses, so a batched credit
// is stored identically to a hand-entered one (trimmed strings, zero-hour categories dropped).
function draftToSave(p: ParsedCredit): Omit<Credit, 'id'> {
  return formToCredit(creditToForm({ ...parsedToDraft(p), id: '' }))
}

// A form save (already an Omit<Credit,'id'>) becomes a parsed draft with full confidence, so an
// edited row rejoins the single "parsed draft" shape the rest of the screen renders and dedups.
function editToParsed(c: Omit<Credit, 'id'>): ParsedCredit {
  return { ...c, confidence: CONFIRMED }
}

function lowConfidenceFields(p: ParsedCredit): FlaggableField[] {
  return (Object.keys(p.confidence) as FlaggableField[]).filter(f => p.confidence[f] === 'low')
}

const chipBase: CSSProperties = { fontSize: 11, fontWeight: 600, padding: '2.5px 8px', borderRadius: 20 }
const chipAccent: CSSProperties = { ...chipBase, background: 'var(--tint)', color: 'var(--accent)' }
const chipMuted: CSSProperties = { ...chipBase, background: 'rgba(60,60,67,.08)', color: '#48484a' }
const chipFlag: CSSProperties = { ...chipBase, background: 'rgba(255,149,0,.13)', color: 'var(--warn-text)' }

function CategoryChips({ parsed }: { parsed: ParsedCredit }) {
  const chips = FORM_CATEGORIES
    .map(k => ({ k, hours: parsed.categoryHours[k] }))
    .filter(({ hours }) => (hours ?? 0) > 0)
  if (chips.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
      {chips.map(({ k, hours }) => (
        <span key={k} style={k === 'general' ? chipMuted : chipAccent}>
          {CATEGORY_LABELS[k]} {hours!.toFixed(1)}
        </span>
      ))}
    </div>
  )
}

// Tinted info box (quota) or amber warning box (daily-limit stop) — the mockup's `.quota` banner.
function Banner({ tone, children }: { tone: 'info' | 'warn'; children: ReactNode }) {
  const bg = tone === 'warn' ? 'rgba(255,149,0,.12)' : 'var(--tint)'
  const dot = tone === 'warn' ? 'var(--warn)' : 'var(--accent)'
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: bg, borderRadius: 12, padding: '11px 13px', margin: '0 2px 18px' }}>
      <span aria-hidden style={{ width: 18, height: 18, borderRadius: '50%', background: dot, color: '#fff', fontSize: 12, fontWeight: 700, display: 'grid', placeItems: 'center', flex: 'none', marginTop: 1 }}>
        {tone === 'warn' ? '!' : 'i'}
      </span>
      <div style={{ fontSize: 13, lineHeight: 1.4 }}>{children}</div>
    </div>
  )
}

function ReadyRow({ parsed, isDuplicate, onEdit }: { parsed: ParsedCredit; isDuplicate: boolean; onEdit?: () => void }) {
  const body = (
    <>
      <span className="ck" style={isDuplicate ? { background: 'var(--faint)' } : undefined}>✓</span>
      <div className="t">
        <div className="n" style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parsed.provider}</div>
        <div className="m q" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parsed.activityTitle}</div>
        {isDuplicate
          ? <div style={{ marginTop: 6 }}><span style={chipFlag}>Duplicate — won't save twice</span></div>
          : <CategoryChips parsed={parsed} />}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flex: 'none' }}>
        <div style={{ fontWeight: 600 }}>{parsed.totalHours.toFixed(1)}h</div>
        {!isDuplicate && <span style={{ fontSize: 12, color: 'var(--accent)' }}>Edit</span>}
      </div>
    </>
  )
  if (isDuplicate || !onEdit) return <div className="row" style={{ opacity: isDuplicate ? 0.72 : 1 }}>{body}</div>
  return (
    <button type="button" className="row tap" style={{ width: '100%', textAlign: 'left', background: 'none', border: 0, font: 'inherit' }}
      aria-label={`Edit ${parsed.provider} — ${parsed.activityTitle}`} onClick={onEdit}>
      {body}
    </button>
  )
}

function CouldntUseRow({ item, onManual }: { item: BulkItem; onManual: () => void }) {
  const why = item.status === 'skipped' ? "Didn't look like a CLE certificate" : (item.error ?? "Couldn't read it")
  return (
    <div className="row">
      <span className="ck" style={{ background: 'rgba(60,60,67,.12)', color: 'var(--muted)' }}>✕</span>
      <div className="t">
        <div className="n">{item.fileName}</div>
        <div className="m q">{why}</div>
      </div>
      <button type="button" className="link" style={{ width: 'auto', margin: 0, padding: 0, fontSize: 13 }} onClick={onManual}>
        Enter manually
      </button>
    </div>
  )
}

export function BatchReview({ files, existingCredits, isGuest, onSave, onBack, onDone }: BatchReviewProps) {
  const { items, run } = useBulkParse()
  const [edits, setEdits] = useState<Record<string, ParsedCredit>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)

  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    run(files)
  }, [run, files])

  useEffect(() => {
    let alive = true
    getParseQuota().then(q => { if (alive) setRemaining(q.remaining) }).catch(() => {})
    return () => { alive = false }
  }, [])

  const parsedFor = (item: BulkItem) => edits[item.id] ?? item.parsed

  // A "ready" item has parsed data (or a manual edit that supplied it); everything else is a
  // skipped/error file to surface separately, or a limit stop we show as a banner.
  const readyItems = items.filter(i => parsedFor(i) !== undefined)
  const couldntUse = items.filter(i => (i.status === 'skipped' || i.status === 'error') && edits[i.id] === undefined)
  const limitReached = items.some(i => i.status === 'limit')
  const settling = items.some(i => i.status === 'pending' || i.status === 'parsing')
  const readCount = items.filter(i => i.status !== 'limit').length

  const seen = new Set<string>()
  const rows = readyItems.map(item => {
    const parsed = parsedFor(item)!
    const signature = creditSignature(parsed)
    const isDuplicate = isDuplicateCredit(parsed, existingCredits) || seen.has(signature)
    seen.add(signature)
    return { item, parsed, isDuplicate }
  })
  const accepted = rows.filter(r => !r.isDuplicate)
  const duplicates = rows.filter(r => r.isDuplicate)

  if (editingId) {
    const editing = items.find(i => i.id === editingId)
    const seed = editing && parsedFor(editing)
    const initial = seed ? creditToForm({ ...parsedToDraft(seed), id: '' }) : undefined
    const flagged = seed && edits[editingId] === undefined ? lowConfidenceFields(seed) : []
    return (
      <div className="wrap">
        <div className="topline"><button className="back" onClick={() => setEditingId(null)}>‹ Back</button><div className="sp" /></div>
        <h1 className="h1" tabIndex={-1}>Edit credit</h1>
        <CreditForm submitLabel="Save credit" initial={initial} lowConfidenceFields={flagged}
          onSave={credit => { setEdits(e => ({ ...e, [editingId]: editToParsed(credit) })); setEditingId(null) }}
          onCancel={() => setEditingId(null)} />
      </div>
    )
  }

  const save = async () => {
    setSaving(true)
    try {
      await onSave(accepted.map(r => draftToSave(r.parsed)))
      onDone()
    } catch {
      setSaveError("Couldn't save — please try again.")
    } finally {
      setSaving(false)
    }
  }

  const noteParts: string[] = []
  if (duplicates.length > 0) noteParts.push(`${duplicates.length} duplicate${duplicates.length === 1 ? '' : 's'} skipped`)
  if (couldntUse.length > 0) noteParts.push(`${couldntUse.length} need${couldntUse.length === 1 ? 's' : ''} attention`)
  const leftToday = remaining != null ? ` · ${remaining} left today` : ''
  const dailyLimit = isGuest ? 10 : 25

  return (
    <div className="wrap">
      <div className="topline"><button className="back" onClick={onBack}>‹ Cancel</button><div className="sp" /></div>
      <h1 className="h1" tabIndex={-1}>{settling ? 'Reading certificates…' : `${readCount} certificate${readCount === 1 ? '' : 's'} read`}</h1>
      <div className="sub">{settling ? 'This only takes a moment.' : 'Check the categories, then save.'}</div>

      <Banner tone="info">
        <b>{dailyLimit} certificates a day{leftToday}.</b>{isGuest ? ' Sign in with Google for 25.' : ''}
      </Banner>

      {accepted.length > 0 && <>
        <div className="label">Ready to save · {accepted.length}</div>
        <div className="list">
          {accepted.map(({ item, parsed }) => (
            <ReadyRow key={item.id} parsed={parsed} isDuplicate={false} onEdit={() => setEditingId(item.id)} />
          ))}
        </div>
      </>}

      {duplicates.length > 0 && <>
        <div className="label">Duplicates · {duplicates.length}</div>
        <div className="list">
          {duplicates.map(({ item, parsed }) => (
            <ReadyRow key={item.id} parsed={parsed} isDuplicate />
          ))}
        </div>
      </>}

      {couldntUse.length > 0 && <>
        <div className="label" style={{ color: 'var(--warn-text)' }}>Couldn't use · {couldntUse.length}</div>
        <div className="list">
          {couldntUse.map(item => (
            <CouldntUseRow key={item.id} item={item} onManual={() => setEditingId(item.id)} />
          ))}
        </div>
      </>}

      {limitReached && (
        <div style={{ marginTop: 18 }}>
          <Banner tone="warn">
            <b>That's your {dailyLimit} for today.</b> Your progress is saved — {isGuest ? 'sign in with Google for 25 a day, or ' : ''}add the rest tomorrow.
          </Banner>
        </div>
      )}

      <button className="btn" disabled={saving || accepted.length === 0} onClick={save}>
        Save {accepted.length} credit{accepted.length === 1 ? '' : 's'}
      </button>
      {noteParts.length > 0 && <div className="note" style={{ marginTop: 8 }}>{noteParts.join(' · ')}</div>}

      <ToastView message={saveError} onDismiss={() => setSaveError(null)} />
    </div>
  )
}

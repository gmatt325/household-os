import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { LocationButtons } from './LocationChooser.jsx'
import { MealFields, DEFAULT_MADE_CUPS, DEFAULT_ATE_PCT } from './MealSheet.jsx'
import { toDatetimeLocal, formatClock } from '../lib/date.js'
import {
  logEvent,
  updateEvent,
  deleteEvent,
  logSession,
  updateSession,
  deleteSession,
} from '../lib/supabaseQueries.js'

const LOC_LABEL = { pad: 'pad', street: 'street', indoor_accident: 'accident' }

// Long-press sheet. Top half logs a NEW backdated entry at a chosen time (with
// the Pad/Street/Accident buttons for potty); bottom half edits/deletes the most
// recent entry of that card. Works for both events and start/stop sessions.
export default function LogSheet({
  card,
  lastEvent,
  lastSession,
  openSession, // the currently-open session of this type (or null)
  night,
  onClose,
  onChanged,
  onCelebrate,
}) {
  const isSession = card.kind === 'session'

  // ---- create (backdate) state ----
  const [when, setWhen] = useState(toDatetimeLocal()) // event time / session start
  const [end, setEnd] = useState('') // session end (blank = still running)
  const [madeCups, setMadeCups] = useState(DEFAULT_MADE_CUPS)
  const [atePct, setAtePct] = useState(DEFAULT_ATE_PCT)
  const [lbs, setLbs] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  // ---- edit-recent state ----
  const [editWhen, setEditWhen] = useState(
    isSession
      ? lastSession
        ? toDatetimeLocal(lastSession.started_at)
        : ''
      : lastEvent
      ? toDatetimeLocal(lastEvent.occurred_at)
      : '',
  )
  const [editEnd, setEditEnd] = useState(lastSession?.ended_at ? toDatetimeLocal(lastSession.ended_at) : '')
  const [editNotes, setEditNotes] = useState(lastEvent?.notes ?? '')

  const field = night
    ? 'bg-pup-nightbg border-pup-nightline text-pup-nightink'
    : 'bg-white border-pup-line text-pup-ink'
  const labelCls = `text-xs uppercase tracking-widest ${night ? 'text-zinc-500' : 'text-pup-muted'}`
  const primaryBtn = 'w-full min-h-[52px] rounded-xl bg-pup-accent text-white text-sm font-semibold uppercase tracking-widest disabled:opacity-50'

  async function run(fn) {
    setBusy(true)
    setErr(null)
    try {
      await fn()
      onChanged?.()
      onClose()
    } catch {
      setErr('Something went wrong — try again.')
      setBusy(false)
    }
  }

  // ---- create actions ----
  const iso = (local) => new Date(local).toISOString()

  function createPotty(location) {
    run(async () => {
      await logEvent(card.type, { location }, iso(when))
      if (location !== 'indoor_accident') onCelebrate?.()
    })
  }
  function createMeal() {
    run(() => logEvent('meal', { made_cups: madeCups, ate_pct: atePct }, iso(when)))
  }
  function createWeight() {
    if (lbs === '') return
    run(() => logEvent('weight', { lbs: Number(lbs) }, iso(when)))
  }
  function createSession() {
    if (!end && openSession) {
      setErr('Already running — set an end time, or edit the current one below.')
      return
    }
    run(() => logSession(card.type, iso(when), end ? iso(end) : null))
  }

  // ---- edit-recent actions ----
  function saveEdit() {
    if (isSession) {
      run(() =>
        updateSession(lastSession.id, {
          started_at: iso(editWhen),
          ended_at: editEnd ? iso(editEnd) : null,
        }),
      )
    } else {
      run(() =>
        updateEvent(lastEvent.id, {
          occurred_at: iso(editWhen),
          notes: editNotes.trim() || null,
        }),
      )
    }
  }
  function removeRecent() {
    run(() => (isSession ? deleteSession(lastSession.id) : deleteEvent(lastEvent.id)))
  }

  // ---- summaries ----
  function eventSummary(e) {
    let extra = ''
    if (e.detail?.location) extra = ` · ${LOC_LABEL[e.detail.location] ?? e.detail.location}`
    else if (e.detail?.lbs != null) extra = ` · ${e.detail.lbs} lbs`
    else if (e.detail?.made_cups != null) extra = ` · ${e.detail.ate_pct ?? 100}% eaten`
    else if (e.detail?.grams != null) extra = ` · ${e.detail.grams} g`
    return `${formatClock(e.occurred_at)}${extra}`
  }
  function sessionSummary(s) {
    return `${formatClock(s.started_at)}–${s.ended_at ? formatClock(s.ended_at) : 'running'}`
  }

  const recent = isSession ? lastSession : lastEvent
  const timeLabel = isSession ? 'Started' : 'Time'

  return (
    <Sheet title={`Log ${card.label}`} night={night} onClose={onClose}>
      <div className="space-y-5">
        {/* ---- Create (backdate) ---- */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>{timeLabel}</label>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className={`w-full rounded-xl border px-4 text-lg font-semibold min-h-[52px] focus:outline-none focus:border-pup-accent ${field}`}
            />
          </div>

          {card.chooseLocation && <LocationButtons night={night} onChoose={createPotty} />}

          {card.type === 'meal' && (
            <>
              <MealFields
                madeCups={madeCups}
                setMadeCups={setMadeCups}
                atePct={atePct}
                setAtePct={setAtePct}
                night={night}
              />
              <button type="button" onClick={createMeal} disabled={busy} className={primaryBtn}>
                Log meal
              </button>
            </>
          )}

          {card.special === 'weight' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Weight (lbs)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={lbs}
                  onChange={(e) => setLbs(e.target.value)}
                  placeholder="4.2"
                  className={`w-full rounded-xl border px-4 text-lg font-semibold min-h-[52px] focus:outline-none focus:border-pup-accent placeholder:text-pup-muted/50 ${field}`}
                />
              </div>
              <button type="button" onClick={createWeight} disabled={busy || lbs === ''} className={primaryBtn}>
                Log weight
              </button>
            </>
          )}

          {isSession && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Ended (optional)</label>
                <input
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className={`w-full rounded-xl border px-4 text-lg font-semibold min-h-[52px] focus:outline-none focus:border-pup-accent ${field}`}
                />
                <p className={`text-xs ${night ? 'text-zinc-500' : 'text-pup-muted'}`}>Leave blank if it's still going.</p>
              </div>
              <button type="button" onClick={createSession} disabled={busy} className={primaryBtn}>
                Log {card.label.toLowerCase()}
              </button>
            </>
          )}

          {err && <p className="text-sm text-pup-red">{err}</p>}
        </div>

        {/* ---- Edit / delete most recent ---- */}
        {recent && (
          <div className={`space-y-3 border-t pt-4 ${night ? 'border-pup-nightline' : 'border-pup-line'}`}>
            <p className={labelCls}>
              Most recent · {isSession ? sessionSummary(recent) : eventSummary(recent)}
            </p>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>{isSession ? 'Started' : 'Time'}</label>
              <input
                type="datetime-local"
                value={editWhen}
                onChange={(e) => setEditWhen(e.target.value)}
                className={`w-full rounded-xl border px-4 text-base font-medium min-h-[50px] focus:outline-none focus:border-pup-accent ${field}`}
              />
            </div>

            {isSession && (
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Ended</label>
                <input
                  type="datetime-local"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className={`w-full rounded-xl border px-4 text-base font-medium min-h-[50px] focus:outline-none focus:border-pup-accent ${field}`}
                />
              </div>
            )}

            {!isSession && (
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  placeholder="optional"
                  className={`w-full rounded-xl border px-4 py-3 text-base focus:outline-none focus:border-pup-accent placeholder:text-pup-muted/60 ${field}`}
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={removeRecent}
                disabled={busy}
                className="flex-1 min-h-[50px] rounded-xl border-2 border-pup-red/60 text-pup-red text-sm font-semibold uppercase tracking-widest disabled:opacity-50"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={busy}
                className="flex-1 min-h-[50px] rounded-xl bg-pup-accent text-white text-sm font-semibold uppercase tracking-widest disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}

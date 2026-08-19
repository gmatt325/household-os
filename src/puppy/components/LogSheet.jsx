import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { LocationButtons } from './LocationChooser.jsx'
import { MealFields, DEFAULT_MADE_CUPS, DEFAULT_ATE_PCT, chipCls } from './MealSheet.jsx'
import TimeField from './TimeField.jsx'
import { toDatetimeLocal, formatClock, formatElapsed } from '../lib/date.js'
import {
  logEvent,
  updateEvent,
  deleteEvent,
  logSession,
  updateSession,
  deleteSession,
} from '../lib/supabaseQueries.js'

const LOC_LABEL = { pad: 'pad', street: 'street', indoor_accident: 'accident' }
const MINUTE = 60000

const agoLocal = (mins) => toDatetimeLocal(new Date(Date.now() - mins * MINUTE).toISOString())

// Quick "N ago" buttons that write straight into the TimeField beside them.
// Typing a time on a phone at 3am is the thing we're trying to avoid.
function RelativeChips({ options, onPick, night }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([label, mins]) => (
        <button key={label} type="button" onClick={() => onPick(agoLocal(mins))} className={chipCls(false, night)}>
          {label}
        </button>
      ))}
    </div>
  )
}

// Hoisted, not inlined in LogSheet: a component declared inside the body gets a
// fresh identity every render, which remounts the inputs under it and drops
// focus mid-typing.
function Divider({ night, children }) {
  return <div className={`space-y-3 border-t pt-4 ${night ? 'border-pup-nightline' : 'border-pup-line'}`}>{children}</div>
}

// Long-press sheet. Events: log a NEW backdated entry at a chosen time, and
// edit/delete the most recent one. Sessions (crate/walk): the sheet leads with
// what's happening RIGHT NOW — if she's in there, ending it is the first thing
// you see; if she isn't, you're adding a finished session.
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
  const noun = card.label.toLowerCase()

  // ---- create (backdate) state ----
  const [when, setWhen] = useState(toDatetimeLocal()) // event time
  const [madeCups, setMadeCups] = useState(DEFAULT_MADE_CUPS)
  const [atePct, setAtePct] = useState(DEFAULT_ATE_PCT)
  const [lbs, setLbs] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  // ---- session state ----
  const [endWhen, setEndWhen] = useState(toDatetimeLocal()) // "came out at"
  const [startFix, setStartFix] = useState(openSession ? toDatetimeLocal(openSession.started_at) : '')
  const [newStart, setNewStart] = useState(agoLocal(60))
  const [newEnd, setNewEnd] = useState(toDatetimeLocal())
  const [stillIn, setStillIn] = useState(false)
  const [showAdd, setShowAdd] = useState(false) // "add an earlier session" while one is open

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
  const secondaryBtn = `w-full min-h-[52px] rounded-xl border-2 text-sm font-semibold uppercase tracking-widest disabled:opacity-50 ${
    night ? 'border-pup-nightline text-pup-nightink' : 'border-pup-line text-pup-ink'
  }`
  const inputCls = `w-full rounded-xl border px-4 text-lg font-semibold min-h-[52px] focus:outline-none focus:border-pup-accent ${field}`

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

  const iso = (local) => new Date(local).toISOString()

  // Nothing validated these before, so a fat-fingered date could write an
  // end-before-start session that the timeline then drew as a zero-height band.
  function rangeError(startLocal, endLocal) {
    const s = new Date(startLocal).getTime()
    if (!Number.isFinite(s)) return 'Pick a start time.'
    if (s > Date.now() + 5 * MINUTE) return "That start time hasn't happened yet."
    if (endLocal) {
      const e = new Date(endLocal).getTime()
      if (!Number.isFinite(e)) return 'Pick an end time.'
      if (e <= s) return 'The end has to be after the start.'
      if (e > Date.now() + 5 * MINUTE) return "That end time hasn't happened yet."
    }
    return null
  }

  function guarded(startLocal, endLocal, fn) {
    const problem = rangeError(startLocal, endLocal)
    if (problem) {
      setErr(problem)
      return
    }
    run(fn)
  }

  // ---- event actions ----
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

  // ---- session actions ----
  function endOpen() {
    guarded(toDatetimeLocal(openSession.started_at), endWhen, () =>
      updateSession(openSession.id, { ended_at: iso(endWhen) }),
    )
  }
  function fixStart() {
    guarded(startFix, openSession.ended_at ? toDatetimeLocal(openSession.ended_at) : null, () =>
      updateSession(openSession.id, { started_at: iso(startFix) }),
    )
  }
  function addEarlier() {
    // One open session per type is a DB constraint, so an extra one added while
    // she's still in there has to be a finished one.
    guarded(newStart, newEnd, () => logSession(card.type, iso(newStart), iso(newEnd)))
  }
  function createSession() {
    guarded(newStart, stillIn ? null : newEnd, () =>
      logSession(card.type, iso(newStart), stillIn ? null : iso(newEnd)),
    )
  }

  // ---- edit-recent actions ----
  function saveEdit() {
    if (isSession) {
      guarded(editWhen, editEnd || null, () =>
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

  // The most-recent block is only useful when nothing is running — an open
  // session is already the whole top half of the sheet.
  const recent = isSession ? (openSession ? null : lastSession) : lastEvent
  const inCopy = card.type === 'crate' ? 'In crate since' : 'Started'
  const outLabel = card.type === 'crate' ? 'Came out at' : 'Ended at'
  const inLabel = card.type === 'crate' ? 'Went in' : 'Started'

  return (
    <Sheet title={`Log ${card.label}`} night={night} onClose={onClose}>
      <div className="space-y-5">
        {/* ---------- Sessions: state-aware ---------- */}
        {isSession && openSession && (
          <>
            <div className={`rounded-xl border-2 border-pup-accent px-4 py-3 ${night ? 'bg-pup-accent/15' : 'bg-pup-accent/10'}`}>
              <p className="text-sm font-semibold text-pup-accent">
                {inCopy} {formatClock(openSession.started_at)}
              </p>
              <p className={`mt-0.5 text-xs ${night ? 'text-zinc-400' : 'text-pup-muted'}`}>
                {formatElapsed((Date.now() - new Date(openSession.started_at).getTime()) / 1000)} so far
              </p>
            </div>

            <div className="space-y-2">
              <label className={labelCls}>{outLabel}</label>
              <TimeField value={endWhen} onChange={setEndWhen} night={night} />
              <RelativeChips
                options={[
                  ['Now', 0],
                  ['15m ago', 15],
                  ['30m ago', 30],
                ]}
                onPick={setEndWhen}
                night={night}
              />
              <button type="button" onClick={endOpen} disabled={busy} className={primaryBtn}>
                End {noun}
              </button>
            </div>

            <Divider night={night}>
              <label className={labelCls}>Fix the start time</label>
              <TimeField value={startFix} onChange={setStartFix} night={night} />
              <RelativeChips
                options={[
                  ['30m ago', 30],
                  ['1h ago', 60],
                  ['2h ago', 120],
                ]}
                onPick={setStartFix}
                night={night}
              />
              <button type="button" onClick={fixStart} disabled={busy} className={secondaryBtn}>
                Save start time
              </button>
            </Divider>

            <Divider night={night}>
              {!showAdd ? (
                <button type="button" onClick={() => setShowAdd(true)} className={secondaryBtn}>
                  Add an earlier {noun}
                </button>
              ) : (
                <>
                  <label className={labelCls}>{inLabel}</label>
                  <TimeField value={newStart} onChange={setNewStart} night={night} />
                  <label className={labelCls}>{outLabel}</label>
                  <TimeField value={newEnd} onChange={setNewEnd} night={night} />
                  <button type="button" onClick={addEarlier} disabled={busy} className={secondaryBtn}>
                    Add {noun}
                  </button>
                </>
              )}
            </Divider>

            {err && <p className="text-sm text-pup-red">{err}</p>}
          </>
        )}

        {isSession && !openSession && (
          <div className="space-y-4">
            <p className={`text-sm ${night ? 'text-zinc-400' : 'text-pup-muted'}`}>
              {card.type === 'crate' ? "She's not in the crate right now." : 'No walk in progress.'}
            </p>

            <div className="flex flex-col gap-2">
              <label className={labelCls}>{inLabel}</label>
              <TimeField value={newStart} onChange={setNewStart} night={night} />
              <RelativeChips
                options={[
                  ['30m ago', 30],
                  ['1h ago', 60],
                  ['2h ago', 120],
                ]}
                onPick={setNewStart}
                night={night}
              />
            </div>

            {!stillIn && (
              <div className="flex flex-col gap-2">
                <label className={labelCls}>{outLabel}</label>
                <TimeField value={newEnd} onChange={setNewEnd} night={night} />
                <RelativeChips
                  options={[
                    ['Now', 0],
                    ['15m ago', 15],
                    ['30m ago', 30],
                  ]}
                  onPick={setNewEnd}
                  night={night}
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => setStillIn((v) => !v)}
              className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm ${
                stillIn
                  ? 'border-pup-accent bg-pup-accent/10 text-pup-accent'
                  : night
                  ? 'border-pup-nightline text-pup-nightink'
                  : 'border-pup-line text-pup-ink'
              }`}
            >
              <span className="text-base">{stillIn ? '☑' : '☐'}</span>
              {card.type === 'crate' ? "She's still in there" : "She's still out on it"}
            </button>

            <button type="button" onClick={createSession} disabled={busy} className={primaryBtn}>
              Add {noun}
            </button>

            {err && <p className="text-sm text-pup-red">{err}</p>}
          </div>
        )}

        {/* ---------- Events: create (backdate) ---------- */}
        {!isSession && (
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Time</label>
              <TimeField value={when} onChange={setWhen} night={night} />
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
                    className={`${inputCls} placeholder:text-pup-muted/50`}
                  />
                </div>
                <button type="button" onClick={createWeight} disabled={busy || lbs === ''} className={primaryBtn}>
                  Log weight
                </button>
              </>
            )}

            {err && <p className="text-sm text-pup-red">{err}</p>}
          </div>
        )}

        {/* ---------- Edit / delete most recent ---------- */}
        {recent && (
          <Divider night={night}>
            <p className={labelCls}>
              Most recent · {isSession ? sessionSummary(recent) : eventSummary(recent)}
            </p>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>{isSession ? inLabel : 'Time'}</label>
              <TimeField value={editWhen} onChange={setEditWhen} night={night} />
            </div>

            {isSession && (
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>{outLabel}</label>
                <TimeField value={editEnd} onChange={setEditEnd} night={night} />
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
          </Divider>
        )}
      </div>
    </Sheet>
  )
}

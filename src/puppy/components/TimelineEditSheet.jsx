import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { toDatetimeLocal, formatClock } from '../lib/date.js'
import TimeField from './TimeField.jsx'
import { updateEvent, deleteEvent, updateSession, deleteSession } from '../lib/supabaseQueries.js'

const LABELS = {
  pee: 'Pee',
  poop: 'Poop',
  meal: 'Meal',
  weight: 'Weight',
  walk: 'Walk',
  crate: 'Crate',
  alone: 'Alone',
}

const LOC_LABEL = { pad: 'Pad', street: 'Street', indoor_accident: 'Accident' }

const iso = (v) => new Date(v).toISOString()
const ms = (v) => new Date(v).getTime()

// Edit control for anything tapped on the day timeline: retime it, or delete it.
// Events write to puppy_events, sessions to puppy_sessions (delete removes the
// whole session — start and end together). An "awake" target isn't a row at all
// — it's the gap between two crate sessions, so its edges write to the crate on
// that side, and only that one.
export default function TimelineEditSheet({ target, night, onClose, onChanged }) {
  const isAwake = target.kind === 'awake'
  const isSession = target.kind === 'session'
  const row = isAwake ? null : target.row

  // Awake gaps carry their neighbours instead of a row of their own.
  const { prev = null, next = null, dayStartMs, openEndMs } = isAwake ? target : {}
  const awakeStartMs = isAwake ? dayStartMs + target.startMin * 60000 : null
  const awakeEndMs = isAwake ? dayStartMs + target.endMin * 60000 : null

  const [when, setWhen] = useState(
    toDatetimeLocal(isAwake ? awakeStartMs : isSession ? row.started_at : row.occurred_at),
  )
  const [end, setEnd] = useState(
    isAwake ? toDatetimeLocal(awakeEndMs) : isSession && row.ended_at ? toDatetimeLocal(row.ended_at) : '',
  )
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const labelCls = `text-xs uppercase tracking-widest ${night ? 'text-zinc-500' : 'text-pup-muted'}`
  const hintCls = `mt-1.5 text-xs ${night ? 'text-zinc-500' : 'text-pup-muted'}`
  const primaryBtn =
    'w-full min-h-[52px] rounded-xl bg-pup-accent text-white text-sm font-semibold uppercase tracking-widest disabled:opacity-50'

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

  // Move an awake window's edges by retiming the crate session on that side.
  // Patches are single-key on purpose: updateSession writes them verbatim, so
  // never sending ended_at here means we can't accidentally re-open a session
  // and trip puppy_sessions_one_open_per_type.
  function saveAwake() {
    const startMs = ms(when)
    const endMs = ms(end)
    if (startMs >= endMs) {
      setErr('Start must be before end.')
      return
    }
    const startChanged = prev && startMs !== awakeStartMs
    const endChanged = next && endMs !== awakeEndMs

    // Neither edge may cross its own crate session — that's what keeps the
    // change local. An inverted session would silently vanish from the track.
    if (startChanged && startMs <= ms(prev.started_at)) {
      setErr(`Start must be after that crate began (${formatClock(prev.started_at)}).`)
      return
    }
    if (endChanged) {
      const nextEndMs = next.ended_at ? ms(next.ended_at) : openEndMs
      if (endMs >= nextEndMs) {
        setErr(`End must be before that crate ends (${formatClock(nextEndMs)}).`)
        return
      }
    }
    if (!startChanged && !endChanged) {
      onClose()
      return
    }

    run(async () => {
      if (startChanged) await updateSession(prev.id, { ended_at: iso(when) })
      if (endChanged) await updateSession(next.id, { started_at: iso(end) })
    })
  }

  function save() {
    if (isAwake) return saveAwake()
    if (!when) return
    if (isSession) {
      // Clearing Ended re-opens the session; the DB allows only one open
      // session per type, and the raw failure reads as a generic error.
      if (!end && target.openOther) {
        setErr('Already running — set an end time.')
        return
      }
      run(() =>
        updateSession(row.id, {
          started_at: iso(when),
          ended_at: end ? iso(end) : null,
        }),
      )
    } else {
      run(() => updateEvent(row.id, { occurred_at: iso(when) }))
    }
  }

  function remove() {
    run(() => (isSession ? deleteSession(row.id) : deleteEvent(row.id)))
  }

  const kindLabel = isAwake ? 'Awake' : LABELS[isSession ? row.session_type : row.event_type] ?? 'Entry'
  const detail = !isAwake && !isSession && row.detail?.location
    ? ` · ${LOC_LABEL[row.detail.location] ?? row.detail.location}`
    : ''
  const subtitle = isAwake
    ? `${formatClock(awakeStartMs)}–${formatClock(awakeEndMs)}`
    : isSession
    ? `${formatClock(row.started_at)}–${row.ended_at ? formatClock(row.ended_at) : 'running'}`
    : `${formatClock(row.occurred_at)}${detail}`

  const startDisabled = isAwake && !prev
  const endDisabled = isAwake && !next

  return (
    <Sheet title={kindLabel} night={night} onClose={onClose}>
      <p className={`-mt-3 mb-5 text-sm ${night ? 'text-zinc-500' : 'text-pup-muted'}`}>{subtitle}</p>

      <div className="space-y-4">
        <div>
          <label className={labelCls}>{isAwake ? 'Woke up' : isSession ? 'Started' : 'Time'}</label>
          <div className="mt-2">
            <TimeField value={when} onChange={setWhen} night={night} disabled={startDisabled} />
          </div>
          {isAwake && (
            <p className={hintCls}>
              {startDisabled ? 'Starts at midnight.' : 'Moves the crate before this to end here.'}
            </p>
          )}
        </div>

        {(isAwake || isSession) && (
          <div>
            <label className={labelCls}>{isAwake ? 'Went in crate' : 'Ended'}</label>
            <div className="mt-2">
              <TimeField value={end} onChange={setEnd} night={night} disabled={endDisabled} />
            </div>
            <p className={hintCls}>
              {isAwake
                ? endDisabled
                  ? 'Still awake.'
                  : 'Moves the crate after this to start here.'
                : "Leave blank if it's still running."}
            </p>
          </div>
        )}

        {err && <p className="text-sm text-pup-red">{err}</p>}

        <button type="button" onClick={save} disabled={busy || !when} className={primaryBtn}>
          Save
        </button>
        {!isAwake && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="w-full min-h-[52px] rounded-xl border border-pup-red/50 text-sm font-semibold uppercase tracking-widest text-pup-red disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>
    </Sheet>
  )
}

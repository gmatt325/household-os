import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { toDatetimeLocal, formatClock } from '../lib/date.js'
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

// Edit control for anything tapped on the day timeline: retime it, or delete it.
// Events write to puppy_events, sessions to puppy_sessions (delete removes the
// whole session — start and end together).
export default function TimelineEditSheet({ target, night, onClose, onChanged }) {
  const isSession = target.kind === 'session'
  const row = target.row

  const [when, setWhen] = useState(
    toDatetimeLocal(isSession ? row.started_at : row.occurred_at),
  )
  const [end, setEnd] = useState(isSession && row.ended_at ? toDatetimeLocal(row.ended_at) : '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const field = night
    ? 'bg-pup-nightbg border-pup-nightline text-pup-nightink'
    : 'bg-white border-pup-line text-pup-ink'
  const labelCls = `text-xs uppercase tracking-widest ${night ? 'text-zinc-500' : 'text-pup-muted'}`
  const inputCls = `w-full rounded-xl border px-4 text-lg font-semibold min-h-[52px] focus:outline-none focus:border-pup-accent ${field}`
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

  function save() {
    if (isSession) {
      if (!when) return
      run(() =>
        updateSession(row.id, {
          started_at: new Date(when).toISOString(),
          ended_at: end ? new Date(end).toISOString() : null,
        }),
      )
    } else {
      if (!when) return
      run(() => updateEvent(row.id, { occurred_at: new Date(when).toISOString() }))
    }
  }

  function remove() {
    run(() => (isSession ? deleteSession(row.id) : deleteEvent(row.id)))
  }

  const kindLabel = LABELS[isSession ? row.session_type : row.event_type] ?? 'Entry'
  const detail = !isSession && row.detail?.location ? ` · ${LOC_LABEL[row.detail.location] ?? row.detail.location}` : ''
  const subtitle = isSession
    ? `${formatClock(row.started_at)}–${row.ended_at ? formatClock(row.ended_at) : 'running'}`
    : `${formatClock(row.occurred_at)}${detail}`

  return (
    <Sheet title={kindLabel} night={night} onClose={onClose}>
      <p className={`-mt-3 mb-5 text-sm ${night ? 'text-zinc-500' : 'text-pup-muted'}`}>{subtitle}</p>

      <div className="space-y-4">
        <div>
          <label className={labelCls}>{isSession ? 'Started' : 'Time'}</label>
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className={`mt-2 ${inputCls}`}
          />
        </div>

        {isSession && (
          <div>
            <label className={labelCls}>Ended</label>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className={`mt-2 ${inputCls}`}
            />
            <p className={`mt-1.5 text-xs ${night ? 'text-zinc-500' : 'text-pup-muted'}`}>
              Leave blank if it's still running.
            </p>
          </div>
        )}

        {err && <p className="text-sm text-pup-red">{err}</p>}

        <button type="button" onClick={save} disabled={busy || !when} className={primaryBtn}>
          Save
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="w-full min-h-[52px] rounded-xl border border-pup-red/50 text-sm font-semibold uppercase tracking-widest text-pup-red disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </Sheet>
  )
}

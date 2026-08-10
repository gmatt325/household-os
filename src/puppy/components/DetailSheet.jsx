import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { toDatetimeLocal } from '../lib/date.js'
import { updateEvent, deleteEvent } from '../lib/supabaseQueries.js'

// Long-press detail: edit time (backdate), notes, or delete an event.
export default function DetailSheet({ event, label, night, onClose, onChanged }) {
  const [when, setWhen] = useState(() => toDatetimeLocal(event.occurred_at))
  const [notes, setNotes] = useState(event.notes ?? '')
  const [busy, setBusy] = useState(false)

  const field = night
    ? 'bg-pup-nightbg border-pup-nightline text-pup-nightink'
    : 'bg-white border-pup-line text-pup-ink'

  async function save() {
    setBusy(true)
    try {
      await updateEvent(event.id, {
        occurred_at: new Date(when).toISOString(),
        notes: notes.trim() || null,
      })
      onChanged?.()
      onClose()
    } catch {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await deleteEvent(event.id)
      onChanged?.()
      onClose()
    } catch {
      setBusy(false)
    }
  }

  return (
    <Sheet title={`Edit ${label}`} night={night} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className={`text-xs uppercase tracking-widest ${night ? 'text-zinc-500' : 'text-pup-muted'}`}>Time</label>
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className={`w-full rounded-xl border px-4 text-lg font-semibold min-h-[52px] focus:outline-none focus:border-pup-accent ${field}`}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={`text-xs uppercase tracking-widest ${night ? 'text-zinc-500' : 'text-pup-muted'}`}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="optional"
            className={`w-full rounded-xl border px-4 py-3 text-base focus:outline-none focus:border-pup-accent placeholder:text-pup-muted/60 ${field}`}
          />
        </div>
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="flex-1 min-h-[52px] rounded-xl border-2 border-pup-red/60 text-pup-red text-sm font-semibold uppercase tracking-widest disabled:opacity-50"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="flex-1 min-h-[52px] rounded-xl bg-pup-accent text-white text-sm font-semibold uppercase tracking-widest disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}

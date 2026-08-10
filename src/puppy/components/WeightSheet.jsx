import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { logEvent } from '../lib/supabaseQueries.js'

// Logs a weight event ({ lbs }). Used by the weight card tap and the weekly prompt.
export default function WeightSheet({ night, onClose, onLogged }) {
  const [lbs, setLbs] = useState('')
  const [busy, setBusy] = useState(false)

  const field = night
    ? 'bg-pup-nightbg border-pup-nightline text-pup-nightink'
    : 'bg-white border-pup-line text-pup-ink'

  async function save() {
    if (lbs === '') return
    setBusy(true)
    try {
      const row = await logEvent('weight', { lbs: Number(lbs) })
      onLogged?.(row)
      onClose()
    } catch {
      setBusy(false)
    }
  }

  return (
    <Sheet title="Log weight" night={night} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className={`text-xs uppercase tracking-widest ${night ? 'text-zinc-500' : 'text-pup-muted'}`}>Weight (lbs)</label>
          <input
            type="text"
            inputMode="decimal"
            autoFocus
            value={lbs}
            onChange={(e) => setLbs(e.target.value)}
            placeholder="4.2"
            className={`w-full rounded-xl border px-4 text-3xl font-bold min-h-[60px] focus:outline-none focus:border-pup-accent placeholder:text-pup-muted/50 ${field}`}
          />
        </div>
        <button
          type="button"
          onClick={save}
          disabled={busy || lbs === ''}
          className="w-full min-h-[56px] rounded-xl bg-pup-accent text-white text-sm font-semibold uppercase tracking-widest disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Log'}
        </button>
      </div>
    </Sheet>
  )
}

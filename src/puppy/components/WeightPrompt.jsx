import { useState } from 'react'
import WeightSheet from './WeightSheet.jsx'
import { todayISO } from '../lib/date.js'

// Dismissible nudge shown when the latest weight is >7 days old (or never logged).
// Per-day localStorage dismiss, mirroring the fitness MetricsBanner pattern.
export default function WeightPrompt({ lastWeightAt, night, onLogged }) {
  const dismissKey = `puppy-weight-dismissed-${todayISO()}`
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(dismissKey))
  const [open, setOpen] = useState(false)

  const overdue =
    !lastWeightAt || Date.now() - new Date(lastWeightAt).getTime() > 7 * 24 * 60 * 60 * 1000
  if (!overdue || dismissed) return null

  function dismiss() {
    localStorage.setItem(dismissKey, '1')
    setDismissed(true)
  }

  return (
    <>
      <div
        className={`flex items-center justify-between rounded-2xl border px-5 py-4 ${
          night ? 'bg-pup-nightcard border-pup-nightline' : 'bg-pup-card border-pup-line'
        }`}
      >
        <button type="button" onClick={() => setOpen(true)} className="flex-1 text-left">
          <p className="text-sm font-semibold">⚖️ Weekly weigh-in</p>
          <p className={`mt-0.5 text-xs ${night ? 'text-zinc-500' : 'text-pup-muted'}`}>
            {lastWeightAt ? 'Last weight is over a week old — tap to log' : 'No weight logged yet — tap to log'}
          </p>
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className={`ml-3 text-xl leading-none ${night ? 'text-zinc-600' : 'text-pup-muted'}`}
        >
          ×
        </button>
      </div>
      {open && (
        <WeightSheet
          night={night}
          onClose={() => setOpen(false)}
          onLogged={(row) => {
            dismiss()
            onLogged?.(row)
          }}
        />
      )}
    </>
  )
}

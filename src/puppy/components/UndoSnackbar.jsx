import { formatElapsed } from '../lib/date.js'

// Persistent "last: Pee, 2m ago — undo" bar pinned above the tab bar. `entry`
// holds the label + timestamp of the most recent log; undo removes that row.
export default function UndoSnackbar({ entry, now, night, onUndo, onDismiss }) {
  if (!entry) return null
  const elapsed = formatElapsed((now - new Date(entry.at).getTime()) / 1000)
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 pointer-events-none">
      <div
        className={`pointer-events-auto flex items-center gap-4 rounded-full border px-5 py-3 shadow-lg ${
          night ? 'bg-pup-nightcard border-pup-nightline text-pup-nightink' : 'bg-pup-card border-pup-line text-pup-ink'
        }`}
      >
        <span className="text-sm">
          Last: <span className="font-semibold">{entry.label}</span>, {elapsed} ago
        </span>
        <button
          type="button"
          onClick={onUndo}
          className="text-sm font-semibold uppercase tracking-widest text-pup-accent"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className={`text-lg leading-none ${night ? 'text-zinc-500' : 'text-pup-muted'}`}
        >
          ×
        </button>
      </div>
    </div>
  )
}

import Sheet from './Sheet.jsx'

// Quick 3-button location chooser shown right after a pee/poop tap.
// Dismissing (backdrop / ×) cancels — nothing is logged.
const OPTIONS = [
  { key: 'pad', label: 'Pad', emoji: '🟦' },
  { key: 'street', label: 'Street', emoji: '🛣️' },
  { key: 'indoor_accident', label: 'Accident', emoji: '⚠️' },
]

export default function LocationChooser({ eventLabel, night, onChoose, onClose }) {
  return (
    <Sheet title={`${eventLabel} — where?`} night={night} onClose={onClose}>
      <div className="grid grid-cols-3 gap-3">
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onChoose(o.key)}
            className={`flex flex-col items-center gap-2 rounded-2xl border-2 py-5 transition-colors active:scale-[0.97] ${
              o.key === 'indoor_accident'
                ? 'border-pup-red/60'
                : night
                ? 'border-pup-nightline'
                : 'border-pup-line'
            } ${night ? 'bg-pup-nightcard' : 'bg-pup-card'}`}
          >
            <span className="text-3xl">{o.emoji}</span>
            <span className={`text-xs uppercase tracking-widest ${night ? 'text-zinc-400' : 'text-pup-muted'}`}>{o.label}</span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

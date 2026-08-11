import Sheet from './Sheet.jsx'

// Pad / Street / Accident — the single source of truth for potty locations,
// shared by the quick tap chooser and the long-press LogSheet.
export const LOCATION_OPTIONS = [
  { key: 'pad', label: 'Pad', emoji: '🟦' },
  { key: 'street', label: 'Street', emoji: '🛣️' },
  { key: 'indoor_accident', label: 'Accident', emoji: '⚠️' },
]

// The 3-button group (no sheet chrome). Reused inside LocationChooser + LogSheet.
export function LocationButtons({ night, onChoose }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {LOCATION_OPTIONS.map((o) => (
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
  )
}

// Quick 3-button location chooser shown right after a pee/poop tap.
// Dismissing (backdrop / ×) cancels — nothing is logged.
export default function LocationChooser({ eventLabel, night, onChoose, onClose }) {
  return (
    <Sheet title={`${eventLabel} — where?`} night={night} onClose={onClose}>
      <LocationButtons night={night} onChoose={onChoose} />
    </Sheet>
  )
}

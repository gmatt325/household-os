import { useState } from 'react'

export default function MorningStretch({ stretch }) {
  const [checked, setChecked] = useState(() =>
    Object.fromEntries((stretch.moves ?? []).map((_, i) => [i, false]))
  )

  const toggle = (i) => setChecked((prev) => ({ ...prev, [i]: !prev[i] }))

  return (
    <div className="border border-zinc-800 rounded-xl p-4">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Morning Stretch</p>
        {stretch.duration_minutes && (
          <span className="text-xs text-zinc-600">{stretch.duration_minutes} min</span>
        )}
      </div>
      {stretch.focus && (
        <p className="text-sm text-zinc-400 mb-3">{stretch.focus}</p>
      )}
      <div>
        {(stretch.moves ?? []).map((move, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className={`w-full flex items-center gap-3 py-3 border-b border-zinc-800 last:border-0 text-left min-h-[44px] transition-colors ${
              checked[i] ? 'text-zinc-600' : 'text-zinc-200'
            }`}
          >
            <span
              className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                checked[i] ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-600'
              }`}
            >
              {checked[i] && <span className="text-white text-[10px] leading-none">✓</span>}
            </span>
            <span className={`text-sm ${checked[i] ? 'line-through' : ''}`}>{move}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

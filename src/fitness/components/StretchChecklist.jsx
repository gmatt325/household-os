import { useState } from 'react'

export default function StretchChecklist({ plan, onDone, saving, error }) {
  const [checked, setChecked] = useState(() =>
    Object.fromEntries((plan.exercises ?? []).map((_, i) => [i, false]))
  )

  const toggle = (i) => setChecked((prev) => ({ ...prev, [i]: !prev[i] }))
  const allDone = (plan.exercises ?? []).length > 0 && Object.values(checked).every(Boolean)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <span className="bg-emerald-700 text-white text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full">
          {plan.type}
        </span>
        <span className="bg-zinc-800 text-zinc-400 text-xs uppercase tracking-widest px-3 py-1 rounded-full">
          {plan.time}
        </span>
        <span className="bg-zinc-800 text-zinc-400 text-xs uppercase tracking-widest px-3 py-1 rounded-full">
          {plan.location}
        </span>
      </div>

      <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
        {plan.label}
      </h2>

      <div>
        {(plan.exercises ?? []).map((ex, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className={`w-full flex items-center gap-4 py-4 px-1 border-b border-zinc-800 text-left transition-colors min-h-[56px] ${
              checked[i] ? 'text-zinc-600' : 'text-zinc-100'
            }`}
          >
            <span
              className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                checked[i] ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-600'
              }`}
            >
              {checked[i] && <span className="text-white text-xs leading-none">✓</span>}
            </span>
            <span className={`font-medium flex-1 ${checked[i] ? 'line-through' : ''}`}>
              {ex.name}
            </span>
            {(ex.duration || ex.reps) && (
              <span className="text-zinc-500 text-sm">
                {ex.duration ?? ex.reps}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={onDone}
        disabled={saving}
        className={`w-full py-4 font-bold text-sm uppercase tracking-widest rounded-xl transition-all active:scale-95 min-h-[56px] disabled:opacity-50 ${
          allDone
            ? 'bg-emerald-500 text-white hover:bg-emerald-400'
            : 'bg-white text-zinc-950 hover:bg-zinc-200'
        }`}
      >
        {saving ? 'Saving…' : 'Done'}
      </button>
    </div>
  )
}

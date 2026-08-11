import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { logEvent } from '../lib/supabaseQueries.js'

export const DEFAULT_MADE_CUPS = 1 / 6
export const DEFAULT_ATE_PCT = 100

const CUP_OPTIONS = [
  { label: '1/6', value: 1 / 6 },
  { label: '1/4', value: 0.25 },
  { label: '1/3', value: 1 / 3 },
  { label: '1/2', value: 0.5 },
  { label: '1', value: 1 },
]
const PCT_OPTIONS = [0, 25, 50, 75, 100]

function Chips({ options, selected, onSelect, night, isSelected }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const val = typeof o === 'object' ? o.value : o
        const label = typeof o === 'object' ? o.label : `${o}%`
        const on = isSelected(val, selected)
        return (
          <button
            key={label}
            type="button"
            onClick={() => onSelect(val)}
            className={`min-w-[52px] rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
              on
                ? 'border-pup-accent bg-pup-accent/10 text-pup-accent'
                : night
                ? 'border-pup-nightline text-pup-nightink'
                : 'border-pup-line text-pup-ink'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

const near = (a, b) => Math.abs(a - b) < 0.001

// Shared "Made (cups)" + "Ate (%)" controls — reused by MealSheet and LogSheet.
export function MealFields({ madeCups, setMadeCups, atePct, setAtePct, night }) {
  const labelCls = `text-xs uppercase tracking-widest ${night ? 'text-zinc-500' : 'text-pup-muted'}`
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <label className={labelCls}>Made (cups)</label>
        <Chips options={CUP_OPTIONS} selected={madeCups} onSelect={setMadeCups} night={night} isSelected={near} />
      </div>
      <div className="flex flex-col gap-2">
        <label className={labelCls}>Ate</label>
        <Chips options={PCT_OPTIONS} selected={atePct} onSelect={setAtePct} night={night} isSelected={(v, s) => v === s} />
      </div>
    </div>
  )
}

// Tap-Meal sheet: how much we made (cups) + how much she ate (%).
export default function MealSheet({ night, onClose, onLogged }) {
  const [madeCups, setMadeCups] = useState(DEFAULT_MADE_CUPS)
  const [atePct, setAtePct] = useState(DEFAULT_ATE_PCT)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      const row = await logEvent('meal', { made_cups: madeCups, ate_pct: atePct })
      onLogged?.(row)
      onClose()
    } catch {
      setBusy(false)
    }
  }

  return (
    <Sheet title="Log meal" night={night} onClose={onClose}>
      <div className="space-y-5">
        <MealFields madeCups={madeCups} setMadeCups={setMadeCups} atePct={atePct} setAtePct={setAtePct} night={night} />
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="w-full min-h-[56px] rounded-xl bg-pup-accent text-white text-sm font-semibold uppercase tracking-widest disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Log meal'}
        </button>
      </div>
    </Sheet>
  )
}

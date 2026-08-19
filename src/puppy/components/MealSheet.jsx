import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { logEvent } from '../lib/supabaseQueries.js'

export const DEFAULT_MADE_CUPS = 0.25
export const DEFAULT_ATE_PCT = 100

const CUP_OPTIONS = [
  { label: '1/4', value: 0.25 },
  { label: '1/2', value: 0.5 },
  { label: '3/4', value: 0.75 },
  { label: '1', value: 1 },
]
// 100 → 0 in 5% steps, biggest first: the scroller opens on 100%, which is the
// answer most nights, and you drag left only when she left some.
const PCT_OPTIONS = Array.from({ length: 21 }, (_, i) => 100 - i * 5)

export const chipCls = (on, night) =>
  `min-w-[52px] flex-none rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
    on
      ? 'border-pup-accent bg-pup-accent/10 text-pup-accent'
      : night
      ? 'border-pup-nightline text-pup-nightink'
      : 'border-pup-line text-pup-ink'
  }`

// `scroll` swaps the wrap for a single horizontal row. overscroll-x-contain
// stops a fling here from chaining out to the tab-wide PuppyPager underneath.
function Chips({ options, selected, onSelect, night, isSelected, scroll = false, children }) {
  return (
    <div className={scroll ? '-mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1 py-0.5' : 'flex flex-wrap gap-2'}>
      {options.map((o) => {
        const val = typeof o === 'object' ? o.value : o
        const label = typeof o === 'object' ? o.label : `${o}%`
        return (
          <button
            key={label}
            type="button"
            onClick={() => onSelect(val)}
            className={chipCls(isSelected(val, selected), night)}
          >
            {label}
          </button>
        )
      })}
      {children}
    </div>
  )
}

const near = (a, b) => Math.abs(a - b) < 0.001

// Shared "Made (cups)" + "Ate (%)" controls — reused by MealSheet and LogSheet.
export function MealFields({ madeCups, setMadeCups, atePct, setAtePct, night }) {
  const isPreset = CUP_OPTIONS.some((o) => near(o.value, madeCups))
  const [customOpen, setCustomOpen] = useState(!isPreset)
  const [custom, setCustom] = useState(isPreset ? '' : String(madeCups))

  function onCustom(v) {
    setCustom(v)
    const n = Number(v)
    if (v !== '' && Number.isFinite(n) && n > 0) setMadeCups(n)
  }

  const labelCls = `text-xs uppercase tracking-widest ${night ? 'text-zinc-500' : 'text-pup-muted'}`
  const field = night
    ? 'bg-pup-nightbg border-pup-nightline text-pup-nightink'
    : 'bg-white border-pup-line text-pup-ink'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <label className={labelCls}>Made (cups)</label>
        <Chips
          options={CUP_OPTIONS}
          selected={madeCups}
          onSelect={(v) => {
            setMadeCups(v)
            setCustomOpen(false)
            setCustom('')
          }}
          night={night}
          isSelected={near}
        >
          <button
            type="button"
            aria-label="Custom amount"
            onClick={() => setCustomOpen((o) => !o)}
            className={chipCls(customOpen || !isPreset, night)}
          >
            +
          </button>
        </Chips>
        {(customOpen || !isPreset) && (
          <input
            type="text"
            inputMode="decimal"
            value={custom}
            onChange={(e) => onCustom(e.target.value)}
            placeholder="e.g. 0.6"
            className={`w-full rounded-xl border px-4 text-lg font-semibold min-h-[52px] focus:outline-none focus:border-pup-accent placeholder:text-pup-muted/50 ${field}`}
          />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <label className={labelCls}>Ate</label>
        <Chips
          options={PCT_OPTIONS}
          selected={atePct}
          onSelect={setAtePct}
          night={night}
          isSelected={(v, s) => v === s}
          scroll
        />
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

import { useState } from 'react'
import Sheet from './Sheet.jsx'
import Chips, { chipCls } from './Chips.jsx'
import { formatClock, formatElapsed } from '../lib/date.js'
import {
  CUP_OPTIONS,
  LEFT_PCT_OPTIONS,
  DEFAULT_ADDED_CUPS,
  levelAfterCheck,
  levelAfterDown,
  logFoodDown,
  logFoodCheck,
  formatCups,
  near,
} from '../lib/food.js'

const labelClsFor = (night) => `text-xs uppercase tracking-widest ${night ? 'text-zinc-500' : 'text-pup-muted'}`

export const primaryBtnCls =
  'w-full min-h-[52px] rounded-xl bg-pup-accent text-white text-sm font-semibold uppercase tracking-widest disabled:opacity-50'
export const secondaryBtnCls = (night) =>
  `w-full min-h-[52px] rounded-xl border-2 text-sm font-semibold uppercase tracking-widest disabled:opacity-50 ${
    night ? 'border-pup-nightline text-pup-nightink' : 'border-pup-line text-pup-ink'
  }`

// "How much is left?" — Empty pinned outside the scroller so it's always one tap
// away, percentages scrolling beside it. Opens on the last reading (see Chips).
export function LeftPctField({ leftPct, setLeftPct, night, label = 'How much is left?' }) {
  return (
    <div className="flex flex-col gap-2">
      <label className={labelClsFor(night)}>{label}</label>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setLeftPct(0)} className={chipCls(leftPct === 0, night)}>
          Empty
        </button>
        <div className="min-w-0 flex-1">
          <Chips
            options={LEFT_PCT_OPTIONS.filter((p) => p > 0)}
            selected={leftPct}
            onSelect={setLeftPct}
            night={night}
            isSelected={(v, s) => v === s}
            scroll
          />
        </div>
      </div>
    </div>
  )
}

// Cup chips + a `+` that reveals a decimal field for anything off the menu.
export function CupsField({ cups, setCups, night, label = 'Adding (cups)' }) {
  const isPreset = CUP_OPTIONS.some((o) => near(o.value, cups))
  const [customOpen, setCustomOpen] = useState(!isPreset)
  const [custom, setCustom] = useState(isPreset ? '' : String(cups))

  function onCustom(v) {
    setCustom(v)
    const n = Number(v)
    if (v !== '' && Number.isFinite(n) && n > 0) setCups(n)
  }

  const field = night
    ? 'bg-pup-nightbg border-pup-nightline text-pup-nightink'
    : 'bg-white border-pup-line text-pup-ink'

  return (
    <div className="flex flex-col gap-2">
      <label className={labelClsFor(night)}>{label}</label>
      <Chips
        options={CUP_OPTIONS}
        selected={cups}
        onSelect={(v) => {
          setCups(v)
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
  )
}

// "1/4 cup onto 10% left → 0.28 cups in the bowl" — says exactly what the button
// is about to write, so the shared left-% control above can't be misread.
export function AddPreview({ bowl, leftPct, addedCups, night }) {
  const after = levelAfterDown(bowl.fullLevel, leftPct, addedCups)
  const onto = bowl.hasFood ? (leftPct === 0 ? ' onto an empty bowl' : ` onto ${leftPct}% left`) : ''
  return (
    <p className={`text-xs ${night ? 'text-zinc-500' : 'text-pup-muted'}`}>
      {formatCups(addedCups)} cup{onto} → {after.toFixed(2)} cups in the bowl
    </p>
  )
}

// Tap-Food sheet. State-aware, like LogSheet is for an open crate session: when
// there's food down the first thing you see is "how much is left", and putting
// more down reuses that same answer rather than asking twice.
export default function FoodSheet({ bowl, night, onClose, onLogged }) {
  const [leftPct, setLeftPct] = useState(bowl.leftPct ?? 100)
  const [addedCups, setAddedCups] = useState(DEFAULT_ADDED_CUPS)
  const [addOpen, setAddOpen] = useState(!bowl.hasFood)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function run(fn, label) {
    setBusy(true)
    setErr(null)
    try {
      const row = await fn()
      onLogged?.(row, label)
      onClose()
    } catch {
      // MealSheet used to swallow this, so a failed log looked like a no-op.
      setErr('Something went wrong — try again.')
      setBusy(false)
    }
  }

  const saveCheck = () => run(() => logFoodCheck({ fullLevel: bowl.fullLevel, leftPct }), 'Food check')
  const putDown = () =>
    run(() => logFoodDown({ fullLevel: bowl.fullLevel, leftPct: bowl.hasFood ? leftPct : 0, addedCups }), 'Food down')
  const pickUp = () => run(() => logFoodCheck({ fullLevel: bowl.fullLevel, removed: true }), 'Picked up')

  const nowLeft = levelAfterCheck(bowl.fullLevel, leftPct)

  return (
    <Sheet title="Food" night={night} onClose={onClose}>
      <div className="space-y-5">
        {bowl.hasFood ? (
          <>
            <div className={`rounded-xl border-2 border-pup-accent px-4 py-3 ${night ? 'bg-pup-accent/15' : 'bg-pup-accent/10'}`}>
              <p className="text-sm font-semibold text-pup-accent">
                {formatCups(bowl.lastDown?.addedCups ?? 0)} cup down at {formatClock(bowl.downAt)}
              </p>
              <p className={`mt-0.5 text-xs ${night ? 'text-zinc-400' : 'text-pup-muted'}`}>
                {formatElapsed((Date.now() - bowl.downAt) / 1000)} ago · about {bowl.level.toFixed(2)} cups left
              </p>
            </div>

            <div className="space-y-3">
              <LeftPctField leftPct={leftPct} setLeftPct={setLeftPct} night={night} />
              <p className={`text-xs ${night ? 'text-zinc-500' : 'text-pup-muted'}`}>
                {leftPct === 0 ? 'She finished it.' : `About ${nowLeft.toFixed(2)} cups.`}
              </p>
              <button type="button" onClick={saveCheck} disabled={busy} className={primaryBtnCls}>
                Save check
              </button>
            </div>

            <div className={`space-y-3 border-t pt-4 ${night ? 'border-pup-nightline' : 'border-pup-line'}`}>
              {!addOpen ? (
                <button type="button" onClick={() => setAddOpen(true)} className={secondaryBtnCls(night)}>
                  + Put more food down
                </button>
              ) : (
                <>
                  <CupsField cups={addedCups} setCups={setAddedCups} night={night} />
                  <AddPreview bowl={bowl} leftPct={leftPct} addedCups={addedCups} night={night} />
                  <button type="button" onClick={putDown} disabled={busy} className={secondaryBtnCls(night)}>
                    Put food down
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={pickUp}
                disabled={busy}
                className={`w-full py-2 text-xs underline ${night ? 'text-zinc-500' : 'text-pup-muted'}`}
              >
                picked it up (she didn't eat it)
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <p className={`text-sm ${night ? 'text-zinc-400' : 'text-pup-muted'}`}>Bowl's empty.</p>
            <CupsField cups={addedCups} setCups={setAddedCups} night={night} label="Put down (cups)" />
            <button type="button" onClick={putDown} disabled={busy} className={primaryBtnCls}>
              Put food down
            </button>
          </div>
        )}

        {err && <p className="text-sm text-pup-red">{err}</p>}
      </div>
    </Sheet>
  )
}

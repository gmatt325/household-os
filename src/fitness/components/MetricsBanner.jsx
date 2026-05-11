import { useState, useEffect } from 'react'
import { todayISO } from '../lib/date.js'
import { fetchBodyMetricsForDate, insertBodyMetrics } from '../lib/supabaseQueries.js'

function isFriday(isoDate) {
  return new Date(isoDate + 'T12:00:00').getDay() === 5
}

function isFirstOfMonth(isoDate) {
  return isoDate.slice(-2) === '01'
}

function NumericField({ label, value, onChange, placeholder, required }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs uppercase tracking-widest text-zinc-500">
        {label}{required && <span className="text-zinc-400 ml-1">*</span>}
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 text-2xl font-bold text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 min-h-[56px]"
      />
    </div>
  )
}

function MetricsForm({ mode, today, onSaved, onClose }) {
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')
  const [chest, setChest] = useState('')
  const [arm, setArm] = useState('')
  const [thigh, setThigh] = useState('')
  const [restingHR, setRestingHR] = useState('')
  const [hrv, setHrv] = useState('')
  const [saveStatus, setSaveStatus] = useState(null)

  const canSubmit = weight !== ''

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setSaveStatus('saving')
    try {
      await insertBodyMetrics({
        logged_date: today,
        weight_lbs: Number(weight),
        waist_inches: waist !== '' ? Number(waist) : null,
        chest_inches: chest !== '' ? Number(chest) : null,
        arm_inches: arm !== '' ? Number(arm) : null,
        thigh_inches: thigh !== '' ? Number(thigh) : null,
        resting_heart_rate: restingHR !== '' ? Number(restingHR) : null,
        hrv: hrv !== '' ? Number(hrv) : null,
      })
      setSaveStatus('saved')
      setTimeout(onSaved, 800)
    } catch {
      setSaveStatus('error')
    }
  }

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-zinc-900 rounded-t-2xl md:rounded-2xl border border-zinc-700 p-6 pb-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold tracking-tight">
            {mode === 'full' ? 'Monthly Check-In' : 'Weekly Weigh-In'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <NumericField label="Weight (lbs)" value={weight} onChange={setWeight} placeholder="135" required />

          {mode === 'full' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <NumericField label="Waist (in)" value={waist} onChange={setWaist} placeholder="28" />
                <NumericField label="Chest (in)" value={chest} onChange={setChest} placeholder="34" />
                <NumericField label="Arm (in)" value={arm} onChange={setArm} placeholder="12" />
                <NumericField label="Thigh (in)" value={thigh} onChange={setThigh} placeholder="21" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <NumericField label="Resting HR" value={restingHR} onChange={setRestingHR} placeholder="58" />
                <NumericField label="HRV" value={hrv} onChange={setHrv} placeholder="45" />
              </div>
            </>
          )}

          {saveStatus === 'error' && (
            <p className="text-red-400 text-sm">Save failed — try again.</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit || saveStatus === 'saving' || saveStatus === 'saved'}
            className={`w-full py-4 font-bold text-sm uppercase tracking-widest rounded-xl min-h-[56px] transition-colors ${
              saveStatus === 'saved'
                ? 'bg-emerald-600 text-white'
                : !canSubmit || saveStatus === 'saving'
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-white text-zinc-950 active:bg-zinc-200'
            }`}
          >
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? '✓ Logged' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function MetricsBanner() {
  const today = todayISO()
  const dismissKey = `metrics-dismissed-${today}`

  const [mode, setMode] = useState(null) // null | 'weight' | 'full'
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(dismissKey))
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    if (dismissed) return
    const shouldPrompt = isFirstOfMonth(today) || isFriday(today)
    if (!shouldPrompt) return

    fetchBodyMetricsForDate(today)
      .then((row) => {
        if (!row) setMode(isFirstOfMonth(today) ? 'full' : 'weight')
      })
      .catch(() => {})
  }, [today, dismissed])

  function dismiss() {
    localStorage.setItem(dismissKey, '1')
    setDismissed(true)
    setMode(null)
  }

  function handleSaved() {
    setFormOpen(false)
    dismiss()
  }

  if (!mode) return null

  return (
    <>
      <div className="w-full max-w-md mx-auto px-4 md:max-w-3xl md:px-8 pt-4">
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="w-full flex items-center justify-between bg-zinc-800 border border-zinc-600 rounded-2xl px-5 py-4 text-left active:bg-zinc-700 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-zinc-100">
              {mode === 'full' ? 'Monthly measurements due' : 'Friday weigh-in'}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">Tap to log</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs text-zinc-400 uppercase tracking-widest">Log</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); dismiss() }}
              className="text-zinc-600 text-xl leading-none px-1"
            >
              ×
            </button>
          </div>
        </button>
      </div>

      {formOpen && (
        <MetricsForm
          mode={mode}
          today={today}
          onSaved={handleSaved}
          onClose={() => setFormOpen(false)}
        />
      )}
    </>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTodaysPlan } from '../hooks/useTodaysPlan.js'
import { useFitnessProgram } from '../hooks/useFitnessProgram.js'
import { upsertWorkoutLog } from '../lib/supabaseQueries.js'

const RIDE_TYPES = ['Pop', 'Era', 'HIIT', 'Hills / Climb', '45 min', 'Other']

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs uppercase tracking-widest text-zinc-500">{label}</label>
      {children}
    </div>
  )
}

function NumberInput({ value, onChange, placeholder, step = 1 }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 text-2xl font-bold text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 min-h-[56px]"
    />
  )
}

export default function PelotonLog() {
  const navigate = useNavigate()
  const { weeklyPlan, today } = useTodaysPlan()
  const { program } = useFitnessProgram()

  const [duration, setDuration] = useState('')
  const [rideType, setRideType] = useState('')
  const [outputWatts, setOutputWatts] = useState('')
  const [calories, setCalories] = useState('')
  const [avgHR, setAvgHR] = useState('')
  const [maxHR, setMaxHR] = useState('')
  const [saveStatus, setSaveStatus] = useState(null)

  const canSubmit = duration !== '' || outputWatts !== ''

  async function handleSubmit(e) {
    e.preventDefault()
    setSaveStatus('saving')
    try {
      await upsertWorkoutLog(null, {
        program_id: program?.id ?? null,
        weekly_plan_id: weeklyPlan?.id ?? null,
        workout_date: today,
        workout_type: rideType || 'Peloton',
        duration_minutes: duration !== '' ? Number(duration) : null,
        peloton_output_watts: outputWatts !== '' ? Number(outputWatts) : null,
        peloton_ride_type: rideType || null,
        active_calories: calories !== '' ? Number(calories) : null,
        avg_heart_rate: avgHR !== '' ? Number(avgHR) : null,
        max_heart_rate: maxHR !== '' ? Number(maxHR) : null,
      })
      setSaveStatus('saved')
      setTimeout(() => navigate('/dashboard/fitness'), 1200)
    } catch {
      setSaveStatus('error')
    }
  }

  return (
    <div className="py-6">
      <button
        onClick={() => navigate('/dashboard/fitness')}
        className="text-xs uppercase tracking-widest text-zinc-500 mb-6 min-h-[44px] flex items-center"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-bold tracking-tight mb-8">Peloton Log</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-x-6">
          <Field label="Duration (min)">
            <NumberInput value={duration} onChange={setDuration} placeholder="45" />
          </Field>

          <Field label="Ride Type">
            <select
              value={rideType}
              onChange={(e) => setRideType(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 text-xl font-bold text-zinc-100 focus:outline-none focus:border-zinc-400 min-h-[56px] appearance-none"
            >
              <option value="">Select…</option>
              {RIDE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>

          <Field label="Output (watts)">
            <NumberInput value={outputWatts} onChange={setOutputWatts} placeholder="250" />
          </Field>

          <Field label="Active Calories">
            <NumberInput value={calories} onChange={setCalories} placeholder="400" />
          </Field>

          <Field label="Avg Heart Rate">
            <NumberInput value={avgHR} onChange={setAvgHR} placeholder="148" />
          </Field>

          <Field label="Max Heart Rate">
            <NumberInput value={maxHR} onChange={setMaxHR} placeholder="172" />
          </Field>
        </div>

        <div className="pt-2">
          {saveStatus === 'error' && (
            <p className="text-red-400 text-sm mb-3">Save failed — try again.</p>
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
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? '✓ Logged' : 'Log Ride'}
          </button>
        </div>
      </form>
    </div>
  )
}

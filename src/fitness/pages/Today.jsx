import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTodaysPlan } from '../hooks/useTodaysPlan.js'
import { useFitnessProgram } from '../hooks/useFitnessProgram.js'
import { formatDayLabel } from '../lib/date.js'
import { upsertWorkoutLog } from '../lib/supabaseQueries.js'
import { LiftingLogForm } from './LiftingLog.jsx'

function RestDayView({ plan, program, weeklyPlan, today }) {
  const moves = plan.morning_stretch?.moves ?? []
  const [checked, setChecked] = useState(() =>
    Object.fromEntries(moves.map((_, i) => [i, false]))
  )
  const [saveStatus, setSaveStatus] = useState(null)
  const logIdRef = useRef(null)
  const saveTimer = useRef(null)

  async function handleToggle(i) {
    const next = { ...checked, [i]: !checked[i] }
    setChecked(next)
    const completedMoves = moves.filter((_, idx) => next[idx])
    if (!completedMoves.length) return
    setSaveStatus('saving')
    clearTimeout(saveTimer.current)
    try {
      logIdRef.current = await upsertWorkoutLog(logIdRef.current, {
        program_id: program?.id ?? null,
        weekly_plan_id: weeklyPlan?.id ?? null,
        workout_date: today,
        workout_type: 'Morning Stretch',
        notes: completedMoves.join(', '),
      })
      setSaveStatus('saved')
      saveTimer.current = setTimeout(() => setSaveStatus(null), 2000)
    } catch {
      setSaveStatus('error')
    }
  }

  return (
    <div className="border border-zinc-800 rounded-xl p-4">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Morning Stretch</p>
        <div className="flex items-center gap-3">
          {saveStatus && (
            <span className={`text-xs ${saveStatus === 'saved' ? 'text-emerald-400' : saveStatus === 'saving' ? 'text-zinc-500' : 'text-red-400'}`}>
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? '✓ Saved' : 'Error'}
            </span>
          )}
          {plan.morning_stretch?.duration_minutes && (
            <span className="text-xs text-zinc-600">{plan.morning_stretch.duration_minutes} min</span>
          )}
        </div>
      </div>
      {plan.morning_stretch?.focus && (
        <p className="text-sm text-zinc-400 mb-3">{plan.morning_stretch.focus}</p>
      )}
      {moves.map((move, i) => (
        <button key={i} onClick={() => handleToggle(i)}
          className={`w-full flex items-center gap-3 py-3 border-b border-zinc-800 last:border-0 text-left min-h-[48px] transition-colors ${checked[i] ? 'text-zinc-600' : 'text-zinc-200'}`}>
          <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${checked[i] ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-600'}`}>
            {checked[i] && <span className="text-white text-[10px] leading-none">✓</span>}
          </span>
          <span className={`text-sm flex-1 ${checked[i] ? 'line-through' : ''}`}>{move}</span>
        </button>
      ))}
    </div>
  )
}

export default function Today() {
  const navigate = useNavigate()
  const { weeklyPlan, dayPlan, logs, isCompleted, loading, error, today } = useTodaysPlan()
  const { program } = useFitnessProgram()

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-zinc-500 text-xs uppercase tracking-widest">
          {formatDayLabel(today)}
        </p>
        <button onClick={() => navigate('/dashboard/fitness/week')}
          className="text-xs uppercase tracking-widest text-zinc-500 active:text-zinc-300">
          Week →
        </button>
      </div>

      {loading && <p className="text-zinc-500 text-sm uppercase tracking-widest">Loading…</p>}
      {!loading && error && <p className="text-red-400 text-sm">Couldn't load plan — {error.message}</p>}

      {!loading && !error && !dayPlan && (
        <div>
          <p className="text-2xl font-bold mb-2">Rest Day</p>
          <p className="text-sm text-zinc-500">No plan found for today.</p>
        </div>
      )}

      {!loading && !error && dayPlan && (
        <>
          {dayPlan.type === 'lift' && (
            <LiftingLogForm
              dayPlan={dayPlan}
              weeklyPlan={weeklyPlan}
              program={program}
              today={today}
              logs={logs}
            />
          )}

          {(dayPlan.type === 'rest' || dayPlan.type === 'stretch') && (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="bg-zinc-700 text-white text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full">
                  Rest
                </span>
                {isCompleted && (
                  <span className="bg-emerald-900 text-emerald-400 text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full">
                    ✓ Logged
                  </span>
                )}
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-6">Rest Day</h2>
              {dayPlan.morning_stretch && (
                <RestDayView plan={dayPlan} program={program} weeklyPlan={weeklyPlan} today={today} />
              )}
            </>
          )}

          {dayPlan.type === 'cardio' && (
            <div>
              <p className="text-3xl font-bold mb-2">{dayPlan.label ?? dayPlan.workout ?? 'Cardio'}</p>
              <p className="text-zinc-500 text-sm mb-6">{dayPlan.notes ?? ''}</p>
              {isCompleted && (
                <p className="text-emerald-400 text-sm mb-4">✓ Logged today</p>
              )}
              <button
                onClick={() => navigate('/dashboard/fitness/peloton')}
                className="w-full py-4 bg-white text-zinc-950 font-bold text-sm uppercase tracking-widest rounded-xl min-h-[56px]"
              >
                {isCompleted ? 'Log Another Ride' : 'Start Peloton Log'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTodaysPlan } from '../hooks/useTodaysPlan.js'
import { useFitnessProgram } from '../hooks/useFitnessProgram.js'
import { formatDayLabel } from '../lib/date.js'
import { upsertWorkoutLog, updateWeeklyPlanDay } from '../lib/supabaseQueries.js'
import { LiftingLogForm, BigSection, RIDE_TYPES, SortableStretchList } from './LiftingLog.jsx'

function RestDayView({ plan, program, weeklyPlan, today, logs = [] }) {
  const initialMoves = plan.morning_stretch?.moves ?? []
  const stretchLog = logs.find(l => l.workout_type === 'Morning Stretch')
  const [moves, setMoves] = useState(initialMoves)
  const [checked, setChecked] = useState(() => {
    if (!stretchLog?.notes) return Object.fromEntries(initialMoves.map(m => [m, false]))
    const savedMoves = stretchLog.notes.split(', ')
    return Object.fromEntries(initialMoves.map(m => [m, savedMoves.includes(m)]))
  })
  const [saveStatus, setSaveStatus] = useState(null)
  const logIdRef = useRef(stretchLog?.id ?? null)
  const saveTimer = useRef(null)

  async function handleToggle(moveName) {
    const next = { ...checked, [moveName]: !checked[moveName] }
    setChecked(next)
    const completedMoves = moves.filter(m => next[m])
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

  async function handleReorder(newMoves) {
    setMoves(newMoves)
    if (!weeklyPlan?.id) return
    try {
      await updateWeeklyPlanDay(weeklyPlan.id, today, {
        ...plan,
        morning_stretch: { ...plan.morning_stretch, moves: newMoves },
      })
    } catch {}
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
      <SortableStretchList moves={moves} checked={checked} onToggle={handleToggle} onReorder={handleReorder} />
    </div>
  )
}

function SaveIndicator({ status }) {
  return (
    <div className="fixed bottom-6 right-6 flex items-center justify-center w-8 h-8 pointer-events-none z-10">
      {status === 'saving' && (
        <span className="w-4 h-4 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin block" />
      )}
      {status === 'saved' && (
        <span className="text-emerald-400 text-base leading-none">✓</span>
      )}
    </div>
  )
}

function CardioDayView({ dayPlan, weeklyPlan, program, today, logs }) {
  const initialMoves = dayPlan.morning_stretch?.moves ?? []
  const stretchLog = logs.find(l => l.workout_type === 'Morning Stretch')
  const pelotonLog = logs.find(l => l.workout_type && l.workout_type !== 'Morning Stretch' && l.peloton_ride_type != null)
    ?? logs.find(l => l.workout_type === 'Peloton')

  const [stretchMoves, setStretchMoves] = useState(initialMoves)
  const [checked, setChecked] = useState(() => {
    if (!stretchLog?.notes) return Object.fromEntries(initialMoves.map(m => [m, false]))
    const saved = stretchLog.notes.split(', ')
    return Object.fromEntries(initialMoves.map(m => [m, saved.includes(m)]))
  })
  const stretchLogIdRef = useRef(stretchLog?.id ?? null)

  const [duration, setDuration] = useState(pelotonLog?.duration_minutes != null ? String(pelotonLog.duration_minutes) : '')
  const [rideType, setRideType] = useState(pelotonLog?.peloton_ride_type ?? '')
  const [watts, setWatts] = useState(pelotonLog?.peloton_output_watts != null ? String(pelotonLog.peloton_output_watts) : '')
  const [calories, setCalories] = useState(pelotonLog?.active_calories != null ? String(pelotonLog.active_calories) : '')
  const [avgHR, setAvgHR] = useState(pelotonLog?.avg_heart_rate != null ? String(pelotonLog.avg_heart_rate) : '')
  const [maxHR, setMaxHR] = useState(pelotonLog?.max_heart_rate != null ? String(pelotonLog.max_heart_rate) : '')
  const pelotonLogIdRef = useRef(pelotonLog?.id ?? null)

  const [saveStatus, setSaveStatus] = useState(null)
  const saveTimer = useRef(null)
  const debounceTimer = useRef(null)

  const triggerSaved = useCallback(() => {
    setSaveStatus('saved')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSaveStatus(null), 2000)
  }, [])

  async function handleStretchToggle(moveName) {
    const next = { ...checked, [moveName]: !checked[moveName] }
    setChecked(next)
    const completedMoves = stretchMoves.filter(m => next[m])
    if (!completedMoves.length) return
    setSaveStatus('saving')
    try {
      stretchLogIdRef.current = await upsertWorkoutLog(stretchLogIdRef.current, {
        program_id: program?.id ?? null,
        weekly_plan_id: weeklyPlan?.id ?? null,
        workout_date: today,
        workout_type: 'Morning Stretch',
        notes: completedMoves.join(', '),
      })
      triggerSaved()
    } catch { setSaveStatus('error') }
  }

  async function handleStretchReorder(newMoves) {
    setStretchMoves(newMoves)
    if (!weeklyPlan?.id) return
    try {
      await updateWeeklyPlanDay(weeklyPlan.id, today, {
        ...dayPlan,
        morning_stretch: { ...dayPlan.morning_stretch, moves: newMoves },
      })
    } catch {}
  }

  const savePeloton = useCallback(async (d, rt, w, cal, aHR, mHR) => {
    if (!d && !w) return
    setSaveStatus('saving')
    try {
      pelotonLogIdRef.current = await upsertWorkoutLog(pelotonLogIdRef.current, {
        program_id: program?.id ?? null,
        weekly_plan_id: weeklyPlan?.id ?? null,
        workout_date: today,
        workout_type: rt || 'Peloton',
        duration_minutes: d !== '' ? Number(d) : null,
        peloton_output_watts: w !== '' ? Number(w) : null,
        peloton_ride_type: rt || null,
        active_calories: cal !== '' ? Number(cal) : null,
        avg_heart_rate: aHR !== '' ? Number(aHR) : null,
        max_heart_rate: mHR !== '' ? Number(mHR) : null,
      })
      triggerSaved()
    } catch { setSaveStatus('error') }
  }, [program, weeklyPlan, today, triggerSaved])

  function scheduleSave(d, rt, w, cal, aHR, mHR) {
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => savePeloton(d, rt, w, cal, aHR, mHR), 800)
  }

  function handleField(setter, getValue) {
    return (e) => {
      const val = e.target.value
      setter(val)
      const next = getValue(val)
      scheduleSave(...next)
    }
  }

  const stretchDone = stretchMoves.length > 0 && stretchMoves.every(m => checked[m])
  const pelotonFilled = duration !== '' || watts !== ''

  return (
    <div className="pb-8">
      <SaveIndicator status={saveStatus} />
      <p className="text-3xl font-bold mb-2">{dayPlan.label ?? dayPlan.workout ?? 'Cardio'}</p>
      {dayPlan.notes && <p className="text-zinc-500 text-sm mb-6">{dayPlan.notes}</p>}

      <div className="space-y-4 mt-6">
        {dayPlan.morning_stretch && (
          <BigSection
            title="Morning Stretch"
            subtitle={[
              dayPlan.morning_stretch.duration_minutes ? `${dayPlan.morning_stretch.duration_minutes} min` : null,
              dayPlan.morning_stretch.focus,
            ].filter(Boolean).join(' · ')}
            done={stretchDone}
          >
            <SortableStretchList moves={stretchMoves} checked={checked} onToggle={handleStretchToggle} onReorder={handleStretchReorder} />
          </BigSection>
        )}

        <BigSection
          title="Peloton"
          subtitle={dayPlan.workout ?? null}
          done={pelotonFilled}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-5 pt-1">
            <div className="flex flex-col gap-1.5">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Duration (min)</p>
              <input type="text" inputMode="numeric" value={duration} placeholder="30"
                onChange={handleField(setDuration, (v) => [v, rideType, watts, calories, avgHR, maxHR])}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 text-2xl font-bold text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 min-h-[56px]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Ride Type</p>
              <select value={rideType}
                onChange={handleField(setRideType, (v) => [duration, v, watts, calories, avgHR, maxHR])}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 text-xl font-bold text-zinc-100 focus:outline-none focus:border-zinc-400 min-h-[56px] appearance-none">
                <option value="">Select…</option>
                {RIDE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Output (watts)</p>
              <input type="text" inputMode="decimal" value={watts} placeholder="250"
                onChange={handleField(setWatts, (v) => [duration, rideType, v, calories, avgHR, maxHR])}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 text-2xl font-bold text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 min-h-[56px]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Active Calories</p>
              <input type="text" inputMode="numeric" value={calories} placeholder="300"
                onChange={handleField(setCalories, (v) => [duration, rideType, watts, v, avgHR, maxHR])}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 text-2xl font-bold text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 min-h-[56px]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Avg Heart Rate</p>
              <input type="text" inputMode="numeric" value={avgHR} placeholder="148"
                onChange={handleField(setAvgHR, (v) => [duration, rideType, watts, calories, v, maxHR])}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 text-2xl font-bold text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 min-h-[56px]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Max Heart Rate</p>
              <input type="text" inputMode="numeric" value={maxHR} placeholder="172"
                onChange={handleField(setMaxHR, (v) => [duration, rideType, watts, calories, avgHR, v])}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 text-2xl font-bold text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 min-h-[56px]" />
            </div>
          </div>
        </BigSection>
      </div>
    </div>
  )
}

export default function Today() {
  const navigate = useNavigate()
  const { weeklyPlan, dayPlan, logs, isCompleted, loading, error, today, refetch } = useTodaysPlan()
  const { program } = useFitnessProgram()

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-zinc-500 text-xs uppercase tracking-widest">
          {formatDayLabel(today)}
        </p>
        <button onClick={() => navigate('/dashboard/fitness/week')}
          className="text-xs uppercase tracking-widest text-zinc-500 active:text-zinc-300 min-h-[44px] px-1">
          Week →
        </button>
      </div>

      {loading && <p className="text-zinc-500 text-sm uppercase tracking-widest">Loading…</p>}
      {!loading && error && (
        <div className="py-2">
          <p className="text-red-400 text-sm mb-3">Couldn't load — try again.</p>
          <button onClick={refetch} className="text-xs uppercase tracking-widest text-zinc-400 border border-zinc-700 rounded-xl px-4 min-h-[44px]">Retry</button>
        </div>
      )}

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
                <RestDayView plan={dayPlan} program={program} weeklyPlan={weeklyPlan} today={today} logs={logs} />
              )}
            </>
          )}

          {dayPlan.type === 'cardio' && (
            <CardioDayView
              dayPlan={dayPlan}
              weeklyPlan={weeklyPlan}
              program={program}
              today={today}
              logs={logs}
            />
          )}
        </>
      )}
    </div>
  )
}

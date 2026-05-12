import { useReducer, useState, useRef, useCallback } from 'react'
import { useTodaysPlan } from '../hooks/useTodaysPlan.js'
import { useFitnessProgram } from '../hooks/useFitnessProgram.js'
import { upsertWorkoutLog, completeWorkoutTasksForToday } from '../lib/supabaseQueries.js'
import SetRow from '../components/SetRow.jsx'

function initSets(exercises, loggedExercises = []) {
  return exercises.map((ex) => {
    const logged = loggedExercises.find((l) => l.name === ex.name)
    return {
      name: ex.name,
      note: ex.note ?? null,
      isBodyweight: ex.weight_lbs == null,
      plannedWeight: ex.weight_lbs,
      plannedReps: ex.reps,
      sets: Array.from({ length: ex.sets ?? 1 }, (_, i) => {
        const s = logged?.sets?.[i]
        return {
          weight_lbs: s?.weight_lbs != null ? String(s.weight_lbs) : (ex.weight_lbs != null ? String(ex.weight_lbs) : ''),
          reps: s?.reps != null ? String(s.reps) : '',
          duration_sec: s?.duration_sec != null ? String(s.duration_sec) : '',
        }
      }),
    }
  })
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_WEIGHT':
      return state.map((ex, i) =>
        i !== action.exIdx ? ex
          : { ...ex, sets: ex.sets.map((s, j) => j !== action.setIdx ? s : { ...s, weight_lbs: action.value }) }
      )
    case 'SET_REPS':
      return state.map((ex, i) =>
        i !== action.exIdx ? ex
          : { ...ex, sets: ex.sets.map((s, j) => j !== action.setIdx ? s : { ...s, reps: action.value }) }
      )
    case 'SET_DURATION':
      return state.map((ex, i) =>
        i !== action.exIdx ? ex
          : { ...ex, sets: ex.sets.map((s, j) => j !== action.setIdx ? s : { ...s, duration_sec: action.value }) }
      )
    default:
      return state
  }
}

function buildPayload(exercises) {
  return exercises.map((ex) => {
    const sets = ex.sets
      .filter((s) => (ex.isBodyweight ? s.duration_sec !== '' : s.reps !== ''))
      .map((s) => {
        if (ex.isBodyweight) return { duration_sec: Number(s.duration_sec) }
        const entry = { reps: Number(s.reps), weight_lbs: Number(s.weight_lbs) }
        if (ex.note) entry.note = ex.note
        return entry
      })
    const out = { name: ex.name, sets }
    if (ex.note) out.note = ex.note
    return out
  }).filter((ex) => ex.sets.length > 0)
}

function isExDone(ex) {
  return ex.sets.every((s) => (ex.isBodyweight ? s.duration_sec !== '' : s.reps !== ''))
}

function Chevron({ open }) {
  return (
    <svg className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function BigSection({ title, subtitle, done, children, defaultOpen = false, onCollapse }) {
  const [open, setOpen] = useState(defaultOpen)

  const toggle = () => {
    if (open) onCollapse?.()
    setOpen((p) => !p)
  }

  return (
    <div className={`rounded-2xl border-2 transition-colors ${done ? 'border-emerald-600' : 'border-zinc-700'}`}>
      <button type="button" onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-5 min-h-[68px]">
        <div className="text-left">
          <p className={`text-xl font-bold tracking-tight ${done ? 'text-emerald-400' : 'text-zinc-100'}`}>{title}</p>
          {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          {done && <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs">✓</span>}
          <span className="text-zinc-400"><Chevron open={open} /></span>
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-zinc-800 pt-3">
          {children}
        </div>
      )}
    </div>
  )
}

function ExerciseSection({ ex, exIdx, dispatch, done, onCollapse }) {
  const [open, setOpen] = useState(false)
  const filledSets = ex.sets.filter((s) => (ex.isBodyweight ? s.duration_sec !== '' : s.reps !== '')).length

  const toggle = () => {
    if (open) onCollapse?.()
    setOpen((p) => !p)
  }

  return (
    <div className={`rounded-xl border transition-colors ${done ? 'border-emerald-700 bg-emerald-950/30' : 'border-zinc-800 bg-zinc-900/50'}`}>
      <button type="button" onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 min-h-[52px]">
        <div className="flex items-center gap-3 min-w-0">
          {done
            ? <span className="w-4 h-4 rounded-full bg-emerald-500 flex-shrink-0 flex items-center justify-center text-white text-[10px]">✓</span>
            : <span className="w-4 h-4 rounded-full border-2 border-zinc-600 flex-shrink-0" />}
          <div className="text-left min-w-0">
            <p className={`font-medium text-sm truncate ${done ? 'text-emerald-400' : 'text-zinc-100'}`}>
              {ex.name}
              {ex.note && <span className="text-zinc-500 text-xs font-normal ml-1">({ex.note})</span>}
            </p>
            <p className="text-xs text-zinc-500">
              {ex.plannedWeight != null
                ? `${ex.sets.length} × ${ex.plannedReps} @ ${ex.plannedWeight} lbs`
                : `${ex.sets.length} × ${ex.plannedReps}`}
              {filledSets > 0 && !done && ` · ${filledSets}/${ex.sets.length} done`}
            </p>
          </div>
        </div>
        <span className="text-zinc-500 flex-shrink-0 ml-3"><Chevron open={open} /></span>
      </button>
      {open && (
        <div className="px-4 pb-3 border-t border-zinc-800 pt-2">
          {ex.sets.map((setData, setIdx) => (
            <SetRow key={setIdx} setIndex={setIdx} setData={setData}
              plannedReps={ex.plannedReps} isBodyweight={ex.isBodyweight}
              exIdx={exIdx} dispatch={dispatch} />
          ))}
        </div>
      )}
    </div>
  )
}

function StretchMoveList({ moves, checked, onToggle }) {
  return (
    <div className="rounded-xl bg-zinc-900/50 border border-zinc-800">
      {moves.map((move, i) => (
        <button key={i} type="button" onClick={() => onToggle(i)}
          className={`w-full flex items-center gap-3 px-4 py-3 border-b border-zinc-800 last:border-0 text-left min-h-[48px] transition-colors ${checked[i] ? 'text-zinc-600' : 'text-zinc-200'}`}>
          <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${checked[i] ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-600'}`}>
            {checked[i] && <span className="text-white text-[10px] leading-none">✓</span>}
          </span>
          <span className={`text-sm flex-1 ${checked[i] ? 'line-through' : ''}`}>{move}</span>
        </button>
      ))}
    </div>
  )
}

const RIDE_TYPES = ['Pop', 'Era', 'HIIT', 'Hills / Climb', '45 min', 'Other']

export function LiftingLogForm({ dayPlan, weeklyPlan, program, today, logs = [] }) {
  const label = dayPlan.label ?? dayPlan.workout ?? dayPlan.type

  const existingLiftLog = logs.find((l) =>
    l.workout_type && l.workout_type === label && l.exercises?.length
  )

  const [exercises, dispatch] = useReducer(
    reducer,
    [dayPlan.exercises ?? [], existingLiftLog?.exercises ?? []],
    ([planned, logged]) => initSets(planned, logged)
  )

  const logIdRef = useRef(existingLiftLog?.id ?? null)
  const stretchLogIdRef = useRef(null)

  const [stretchChecked, setStretchChecked] = useState(() => {
    const moves = dayPlan.morning_stretch?.moves ?? []
    const stretchLog = logs.find((l) => l.workout_type === 'Morning Stretch')
    if (stretchLog?.notes) {
      const saved = stretchLog.notes.split(', ')
      return Object.fromEntries(moves.map((move, i) => [i, saved.includes(move)]))
    }
    return Object.fromEntries(moves.map((_, i) => [i, false]))
  })

  // Initialise stretchLogIdRef from existing log if present
  useState(() => {
    const stretchLog = logs.find((l) => l.workout_type === 'Morning Stretch')
    if (stretchLog) stretchLogIdRef.current = stretchLog.id
  })

  async function toggleStretch(i) {
    const next = { ...stretchChecked, [i]: !stretchChecked[i] }
    setStretchChecked(next)
    const completedMoves = (dayPlan.morning_stretch?.moves ?? []).filter((_, idx) => next[idx])
    if (!completedMoves.length) return
    try {
      stretchLogIdRef.current = await upsertWorkoutLog(stretchLogIdRef.current, {
        program_id: program?.id ?? null,
        weekly_plan_id: weeklyPlan?.id ?? null,
        workout_date: today,
        workout_type: 'Morning Stretch',
        notes: completedMoves.join(', '),
      })
    } catch {}
  }
  const [saveStatus, setSaveStatus] = useState(null) // null | 'saving' | 'saved' | 'error'
  const saveTimer = useRef(null)

  // Peloton inline state
  const [pelotonDuration, setPelotonDuration] = useState('')
  const [pelotonRideType, setPelotonRideType] = useState('')
  const [pelotonWatts, setPelotonWatts] = useState('')
  const [pelotonCalories, setPelotonCalories] = useState('')
  const [pelotonAvgHR, setPelotonAvgHR] = useState('')
  const [pelotonMaxHR, setPelotonMaxHR] = useState('')
  const [pelotonSaveStatus, setPelotonSaveStatus] = useState(null)
  const pelotonLogIdRef = useRef(null)
  const pelotonSaveTimer = useRef(null)

  const moves = dayPlan.morning_stretch?.moves ?? []
  const stretchDone = moves.length > 0 && Object.values(stretchChecked).every(Boolean)
  const workoutDone = exercises.length > 0 && exercises.every(isExDone)
  const pelotonLogged = logs.some((l) => l.workout_type && l.workout_type.toLowerCase().includes('peloton'))
  const pelotonFilled = pelotonDuration !== '' || pelotonWatts !== ''

  const saveCurrentState = useCallback(async (currentExercises) => {
    const payload = buildPayload(currentExercises)
    if (!payload.length) return
    setSaveStatus('saving')
    clearTimeout(saveTimer.current)
    try {
      logIdRef.current = await upsertWorkoutLog(logIdRef.current, {
        program_id: program?.id ?? null,
        weekly_plan_id: weeklyPlan?.id ?? null,
        workout_date: today,
        workout_type: label,
        exercises: payload,
      })
      setSaveStatus('saved')
      saveTimer.current = setTimeout(() => setSaveStatus(null), 2000)
    } catch {
      setSaveStatus('error')
    }
  }, [program, weeklyPlan, today, label])

  // exercises state is captured in closure — pass current value explicitly
  const handleExerciseCollapse = useCallback(() => {
    saveCurrentState(exercises)
    if (exercises.every(isExDone)) {
      completeWorkoutTasksForToday().catch(() => {})
    }
  }, [exercises, saveCurrentState])

  const savePeloton = useCallback(async (duration, rideType, watts, calories, avgHR, maxHR) => {
    if (!duration && !watts) return
    setPelotonSaveStatus('saving')
    clearTimeout(pelotonSaveTimer.current)
    try {
      pelotonLogIdRef.current = await upsertWorkoutLog(pelotonLogIdRef.current, {
        program_id: program?.id ?? null,
        weekly_plan_id: weeklyPlan?.id ?? null,
        workout_date: today,
        workout_type: rideType || 'Peloton',
        duration_minutes: duration !== '' ? Number(duration) : null,
        peloton_output_watts: watts !== '' ? Number(watts) : null,
        peloton_ride_type: rideType || null,
        active_calories: calories !== '' ? Number(calories) : null,
        avg_heart_rate: avgHR !== '' ? Number(avgHR) : null,
        max_heart_rate: maxHR !== '' ? Number(maxHR) : null,
      })
      setPelotonSaveStatus('saved')
      pelotonSaveTimer.current = setTimeout(() => setPelotonSaveStatus(null), 2000)
    } catch {
      setPelotonSaveStatus('error')
    }
  }, [program, weeklyPlan, today])

  const handlePelotonCollapse = useCallback(() => {
    savePeloton(pelotonDuration, pelotonRideType, pelotonWatts, pelotonCalories, pelotonAvgHR, pelotonMaxHR)
  }, [pelotonDuration, pelotonRideType, pelotonWatts, pelotonCalories, pelotonAvgHR, pelotonMaxHR, savePeloton])

  return (
    <div className="pb-8">
      <div className="flex items-center justify-end mb-4 min-h-[20px]">
        <span className={`text-xs transition-opacity ${saveStatus ? 'opacity-100' : 'opacity-0'} ${
          saveStatus === 'saving' ? 'text-zinc-500' :
          saveStatus === 'saved' ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? '✓ Saved' : 'Save failed'}
        </span>
      </div>

      <div className="space-y-4">
        {dayPlan.morning_stretch && (
          <BigSection
            title="Morning Stretch"
            subtitle={[
              dayPlan.morning_stretch.duration_minutes ? `${dayPlan.morning_stretch.duration_minutes} min` : null,
              dayPlan.morning_stretch.focus,
            ].filter(Boolean).join(' · ')}
            done={stretchDone}
          >
            <StretchMoveList
              moves={moves}
              checked={stretchChecked}
              onToggle={toggleStretch}
            />
          </BigSection>
        )}

        <BigSection
          title={label}
          subtitle={`${exercises.length} exercise${exercises.length !== 1 ? 's' : ''}`}
          done={workoutDone}
          onCollapse={handleExerciseCollapse}
        >
          {dayPlan.warmup && (
            <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 px-4 py-3 mb-1">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Warmup</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{dayPlan.warmup}</p>
            </div>
          )}
          {exercises.map((ex, exIdx) => (
            <ExerciseSection key={exIdx} ex={ex} exIdx={exIdx} dispatch={dispatch}
              done={isExDone(ex)} onCollapse={handleExerciseCollapse} />
          ))}
        </BigSection>

        {dayPlan.peloton && (
          <BigSection
            title="Peloton"
            subtitle={dayPlan.peloton.workout ?? null}
            done={pelotonLogged || pelotonFilled}
            onCollapse={handlePelotonCollapse}
          >
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-end min-h-[16px]">
                <span className={`text-xs transition-opacity ${pelotonSaveStatus ? 'opacity-100' : 'opacity-0'} ${
                  pelotonSaveStatus === 'saving' ? 'text-zinc-500' :
                  pelotonSaveStatus === 'saved' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {pelotonSaveStatus === 'saving' ? 'Saving…' : pelotonSaveStatus === 'saved' ? '✓ Saved' : 'Save failed'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-5">
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs uppercase tracking-widest text-zinc-500">Duration (min)</p>
                  <input type="text" inputMode="numeric" value={pelotonDuration}
                    onChange={(e) => setPelotonDuration(e.target.value)}
                    placeholder="30"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 text-2xl font-bold text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 min-h-[56px]" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <p className="text-xs uppercase tracking-widest text-zinc-500">Ride Type</p>
                  <select value={pelotonRideType} onChange={(e) => setPelotonRideType(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 text-xl font-bold text-zinc-100 focus:outline-none focus:border-zinc-400 min-h-[56px] appearance-none">
                    <option value="">Select…</option>
                    {RIDE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <p className="text-xs uppercase tracking-widest text-zinc-500">Output (watts)</p>
                  <input type="text" inputMode="decimal" value={pelotonWatts}
                    onChange={(e) => setPelotonWatts(e.target.value)}
                    placeholder="250"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 text-2xl font-bold text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 min-h-[56px]" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <p className="text-xs uppercase tracking-widest text-zinc-500">Active Calories</p>
                  <input type="text" inputMode="numeric" value={pelotonCalories}
                    onChange={(e) => setPelotonCalories(e.target.value)}
                    placeholder="300"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 text-2xl font-bold text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 min-h-[56px]" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <p className="text-xs uppercase tracking-widest text-zinc-500">Avg Heart Rate</p>
                  <input type="text" inputMode="numeric" value={pelotonAvgHR}
                    onChange={(e) => setPelotonAvgHR(e.target.value)}
                    placeholder="148"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 text-2xl font-bold text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 min-h-[56px]" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <p className="text-xs uppercase tracking-widest text-zinc-500">Max Heart Rate</p>
                  <input type="text" inputMode="numeric" value={pelotonMaxHR}
                    onChange={(e) => setPelotonMaxHR(e.target.value)}
                    placeholder="172"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 text-2xl font-bold text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 min-h-[56px]" />
                </div>
              </div>
            </div>
          </BigSection>
        )}
      </div>
    </div>
  )
}

export default function LiftingLog() {
  const { weeklyPlan, dayPlan, loading, error, today, refetch } = useTodaysPlan()
  const { program } = useFitnessProgram()

  if (loading) return <div className="py-6 text-zinc-500 text-sm uppercase tracking-widest">Loading…</div>
  if (error) return (
    <div className="py-6">
      <p className="text-red-400 text-sm mb-3">Couldn't load — try again.</p>
      <button onClick={refetch} className="text-xs uppercase tracking-widest text-zinc-400 border border-zinc-700 rounded-xl px-4 min-h-[44px]">Retry</button>
    </div>
  )
  if (!dayPlan || dayPlan.type !== 'lift') return (
    <div className="py-6">
      <p className="text-zinc-500">No lift plan for today.</p>
      <button onClick={() => window.history.back()} className="mt-4 text-xs uppercase tracking-widest text-zinc-500 min-h-[44px] flex items-center">← Back</button>
    </div>
  )

  return <LiftingLogForm dayPlan={dayPlan} weeklyPlan={weeklyPlan} program={program} today={today} />
}

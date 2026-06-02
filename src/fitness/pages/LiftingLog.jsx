import { useReducer, useState, useRef, useCallback, useEffect } from 'react'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTodaysPlan } from '../hooks/useTodaysPlan.js'
import { useFitnessProgram } from '../hooks/useFitnessProgram.js'
import { upsertWorkoutLog, completeWorkoutTasksForToday, updateWeeklyPlanDay, chainedUpsert } from '../lib/supabaseQueries.js'
import { getActivities, replaceActivity, KIND_LIFT } from '../lib/dayShape.js'
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
    case 'REORDER': {
      const reordered = [...state]
      const [moved] = reordered.splice(action.from, 1)
      reordered.splice(action.to, 0, moved)
      return reordered
    }
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

export function BigSection({ title, subtitle, done, children, defaultOpen = false, onCollapse }) {
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

function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
      <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
      <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
    </svg>
  )
}

function ExerciseSection({ ex, exIdx, dispatch, done, open, onToggle }) {
  const filledSets = ex.sets.filter((s) => (ex.isBodyweight ? s.duration_sec !== '' : s.reps !== '')).length
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ex.name })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  return (
    <div ref={setNodeRef} style={style}
      className={`rounded-xl border transition-colors ${done ? 'border-emerald-700 bg-emerald-950/30' : 'border-zinc-800 bg-zinc-900/50'}`}>
      <div className="flex items-center">
        <button
          type="button"
          {...attributes}
          {...(!open ? listeners : {})}
          className={`touch-none px-3 flex-shrink-0 flex items-center self-stretch ${open ? 'text-zinc-800 cursor-default' : 'text-zinc-500 cursor-grab active:cursor-grabbing'}`}
          aria-label="Drag to reorder"
        >
          <GripIcon />
        </button>
        <button type="button" onClick={onToggle}
          className="flex-1 flex items-center justify-between pr-4 py-3 min-h-[52px]">
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
      </div>
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

function SortableStretchRow({ move, checked, onToggle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: move })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const isChecked = checked[move] ?? false
  return (
    <div ref={setNodeRef} style={style}
      className={`flex items-center border-b border-zinc-800 last:border-0 transition-colors ${isChecked ? 'text-zinc-600' : 'text-zinc-200'}`}>
      <button type="button" {...attributes} {...(!isChecked ? listeners : {})}
        className={`touch-none px-3 flex-shrink-0 flex items-center self-stretch ${isChecked ? 'text-zinc-800 cursor-default' : 'text-zinc-500 cursor-grab active:cursor-grabbing'}`}
        aria-label="Drag to reorder">
        <GripIcon />
      </button>
      <button type="button" onClick={() => onToggle(move)}
        className="flex-1 flex items-center gap-3 pr-4 py-3 text-left min-h-[48px]">
        <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${isChecked ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-600'}`}>
          {isChecked && <span className="text-white text-[10px] leading-none">✓</span>}
        </span>
        <span className={`text-sm flex-1 ${isChecked ? 'line-through' : ''}`}>{move}</span>
      </button>
    </div>
  )
}

export function SortableStretchList({ moves, checked, onToggle, onReorder }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )
  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = moves.indexOf(String(active.id))
    const to = moves.indexOf(String(over.id))
    if (from === -1 || to === -1) return
    const reordered = [...moves]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    onReorder(reordered)
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={moves} strategy={verticalListSortingStrategy}>
        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800">
          {moves.map(move => (
            <SortableStretchRow key={move} move={move} checked={checked} onToggle={onToggle} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

export const RIDE_TYPES = ['Pop', 'Era', 'HIIT', 'Hills / Climb', '45 min', 'Other']

export function LiftingLogForm({ liftActivity, dayPlan, weeklyPlan, program, today, logs = [] }) {
  const label = liftActivity.workout ?? 'Lift'

  const existingLiftLog = logs.find((l) =>
    l.workout_type && l.workout_type === label && l.exercises?.length
  )

  const [exercises, dispatch] = useReducer(
    reducer,
    [liftActivity.exercises ?? [], existingLiftLog?.exercises ?? []],
    ([planned, logged]) => initSets(planned, logged)
  )

  const logIdRef = useRef(existingLiftLog?.id ?? null)

  const [openMap, setOpenMap] = useState({})
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const [saveStatus, setSaveStatus] = useState(null) // null | 'saving' | 'saved' | 'error'
  const saveTimer = useRef(null)
  const debounceTimer = useRef(null)
  const savePromiseRef = useRef(null)

  const workoutDone = exercises.length > 0 && exercises.every(isExDone)

  const saveCurrentState = useCallback(async (currentExercises) => {
    const payload = buildPayload(currentExercises)
    if (!payload.length) return
    setSaveStatus('saving')
    clearTimeout(saveTimer.current)
    try {
      await chainedUpsert(savePromiseRef, logIdRef, {
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

  // Debounced auto-save on every change to exercises (reps / weight / duration).
  useEffect(() => {
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      saveCurrentState(exercises)
      if (exercises.length > 0 && exercises.every(isExDone)) {
        completeWorkoutTasksForToday().catch(() => {})
      }
    }, 500)
    return () => clearTimeout(debounceTimer.current)
  }, [exercises, saveCurrentState])

  // Best-effort flush if the tab is closed mid-edit.
  useEffect(() => {
    function flush() {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
        saveCurrentState(exercises)
      }
    }
    window.addEventListener('beforeunload', flush)
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('beforeunload', flush)
      window.removeEventListener('pagehide', flush)
    }
  }, [exercises, saveCurrentState])

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = exercises.findIndex((e) => e.name === active.id)
    const to = exercises.findIndex((e) => e.name === over.id)
    if (from === -1 || to === -1) return
    dispatch({ type: 'REORDER', from, to })
    // Remap openMap indices after reorder
    setOpenMap((m) => {
      const next = {}
      const order = [...Array(exercises.length).keys()]
      const [moved] = order.splice(from, 1)
      order.splice(to, 0, moved)
      order.forEach((oldIdx, newIdx) => { if (m[oldIdx]) next[newIdx] = true })
      return next
    })
    // Persist new order to Supabase via the activity slice of the day
    if (!weeklyPlan?.id) return
    const reordered = [...exercises]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    const reorderedPlanned = reordered.map((ex) => {
      const orig = (liftActivity.exercises ?? []).find((p) => p.name === ex.name)
      return orig ?? { name: ex.name }
    })
    const nextDay = replaceActivity(dayPlan, today, liftActivity.id, (a) => ({
      ...a, exercises: reorderedPlanned,
    }))
    try {
      await updateWeeklyPlanDay(weeklyPlan.id, today, nextDay)
    } catch {}
  }, [exercises, weeklyPlan, dayPlan, today, liftActivity])

  // exercises state is captured in closure — pass current value explicitly
  const handleExerciseCollapse = useCallback(() => {
    saveCurrentState(exercises)
    if (exercises.every(isExDone)) {
      completeWorkoutTasksForToday().catch(() => {})
    }
  }, [exercises, saveCurrentState])

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
        <BigSection
          title={label}
          subtitle={`${exercises.length} exercise${exercises.length !== 1 ? 's' : ''}`}
          done={workoutDone}
          onCollapse={handleExerciseCollapse}
          defaultOpen
        >
          {liftActivity.warmup && (
            <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 px-4 py-3 mb-1">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Warmup</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{liftActivity.warmup}</p>
            </div>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={exercises.map((e) => e.name)} strategy={verticalListSortingStrategy}>
              {exercises.map((ex, exIdx) => (
                <ExerciseSection key={ex.name} ex={ex} exIdx={exIdx} dispatch={dispatch}
                  done={isExDone(ex)}
                  open={openMap[exIdx] ?? false}
                  onToggle={() => {
                    const isOpen = openMap[exIdx] ?? false
                    if (isOpen) handleExerciseCollapse()
                    setOpenMap((m) => ({ ...m, [exIdx]: !isOpen }))
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>
        </BigSection>
      </div>
    </div>
  )
}

export default function LiftingLog() {
  const { weeklyPlan, dayPlan, logs, loading, error, today, refetch } = useTodaysPlan()
  const { program } = useFitnessProgram()

  if (loading) return <div className="py-6 text-zinc-500 text-sm uppercase tracking-widest">Loading…</div>
  if (error) return (
    <div className="py-6">
      <p className="text-red-400 text-sm mb-3">Couldn't load — try again.</p>
      <button onClick={refetch} className="text-xs uppercase tracking-widest text-zinc-400 border border-zinc-700 rounded-xl px-4 min-h-[44px]">Retry</button>
    </div>
  )
  const liftActivity = getActivities(dayPlan, today).find((a) => a.kind === KIND_LIFT)
  if (!liftActivity) return (
    <div className="py-6">
      <p className="text-zinc-500">No lift plan for today.</p>
      <button onClick={() => window.history.back()} className="mt-4 text-xs uppercase tracking-widest text-zinc-500 min-h-[44px] flex items-center">← Back</button>
    </div>
  )

  return <LiftingLogForm liftActivity={liftActivity} dayPlan={dayPlan} weeklyPlan={weeklyPlan} program={program} today={today} logs={logs ?? []} />
}

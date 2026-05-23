import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useSensor, useSensors, useDraggable, useDroppable, pointerWithin,
} from '@dnd-kit/core'
import { todayISO, weekStartISO, addDays } from '../lib/date.js'
import { useWeekPlan } from '../hooks/useWeekPlan.js'
import { updateWeeklyPlanDays } from '../lib/supabaseQueries.js'
import {
  getActivities, moveActivityBetweenDays,
  kindDotClass,
  KIND_STRETCH, KIND_LIFT, KIND_PELOTON,
} from '../lib/dayShape.js'

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function Chevron({ open }) {
  return (
    <svg className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function ExerciseRow({ ex }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
      <button type="button" onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 min-h-[52px]">
        <div className="text-left min-w-0">
          <p className="font-medium text-sm text-zinc-100 truncate">
            {ex.name}
            {ex.note && <span className="text-zinc-500 text-xs font-normal ml-1">({ex.note})</span>}
          </p>
          <p className="text-xs text-zinc-500">
            {ex.weight_lbs != null
              ? `${ex.sets} × ${ex.reps} @ ${ex.weight_lbs} lbs`
              : `${ex.sets} × ${ex.reps}`}
          </p>
        </div>
        <span className="text-zinc-500 flex-shrink-0 ml-3"><Chevron open={open} /></span>
      </button>
      {open && (
        <div className="px-4 pb-3 border-t border-zinc-800 pt-2">
          {Array.from({ length: ex.sets ?? 1 }).map((_, i) => (
            <div key={i} className="py-2 border-b border-zinc-800 last:border-0">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Set {i + 1}</p>
              <p className="text-sm text-zinc-300 mt-0.5">
                {ex.weight_lbs != null ? `${ex.weight_lbs} lbs · ` : ''}{ex.reps} reps
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MoveList({ moves }) {
  return (
    <div className="rounded-xl bg-zinc-900/50 border border-zinc-800">
      {moves.map((move, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 last:border-0 min-h-[48px]">
          <span className="w-4 h-4 rounded border border-zinc-600 flex-shrink-0" />
          <span className="text-sm text-zinc-200">{move}</span>
        </div>
      ))}
    </div>
  )
}

// Kind-tinted card styling. When `done`, emerald overrides the kind color.
function cardClasses(kind, done) {
  if (done) return 'border-emerald-600 bg-emerald-950/20'
  if (kind === KIND_STRETCH) return 'border-amber-700 bg-amber-950/20'
  if (kind === KIND_LIFT) return 'border-zinc-600 bg-zinc-900/40'
  if (kind === KIND_PELOTON) return 'border-blue-700 bg-blue-950/20'
  return 'border-zinc-700 bg-zinc-900/40'
}

function titleClasses(kind, done) {
  if (done) return 'text-emerald-400'
  if (kind === KIND_STRETCH) return 'text-amber-300'
  if (kind === KIND_LIFT) return 'text-zinc-100'
  if (kind === KIND_PELOTON) return 'text-blue-300'
  return 'text-zinc-100'
}

function headerInfo(activity) {
  if (activity.kind === KIND_STRETCH) {
    return {
      title: 'Morning Stretch',
      subtitle: [
        activity.duration_minutes ? `${activity.duration_minutes} min` : null,
        activity.focus,
      ].filter(Boolean).join(' · '),
    }
  }
  if (activity.kind === KIND_LIFT) {
    const n = activity.exercises?.length ?? 0
    return {
      title: activity.workout ?? 'Lift',
      subtitle: `${n} exercise${n === 1 ? '' : 's'}`,
    }
  }
  if (activity.kind === KIND_PELOTON) {
    return {
      title: 'Peloton',
      subtitle: activity.workout ?? activity.ride_type ?? null,
    }
  }
  return { title: activity.kind ?? 'Workout', subtitle: null }
}

function activityDone(activity, dateLogs) {
  if (activity.kind === KIND_STRETCH) {
    return dateLogs.some((l) => l.workout_type === 'Morning Stretch')
  }
  if (activity.kind === KIND_LIFT) {
    return dateLogs.some((l) => l.workout_type === activity.workout)
  }
  if (activity.kind === KIND_PELOTON) {
    return dateLogs.some((l) => l.workout_type?.toLowerCase().includes('peloton')
      || (activity.workout && l.workout_type === activity.workout))
  }
  return false
}

function ActivityBody({ activity }) {
  if (activity.kind === KIND_LIFT) {
    return (
      <div className="space-y-2">
        {activity.warmup && (
          <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 px-4 py-3">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Warmup</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{activity.warmup}</p>
          </div>
        )}
        {(activity.exercises ?? []).map((ex, i) => (
          <ExerciseRow key={i} ex={ex} />
        ))}
      </div>
    )
  }
  if (activity.kind === KIND_PELOTON) {
    return (
      <div className="px-1 py-2 space-y-1">
        {activity.workout && <p className="text-sm text-zinc-300">{activity.workout}</p>}
        {activity.ride_type && <p className="text-xs text-zinc-500">{activity.ride_type}</p>}
        {activity.time && <p className="text-xs text-zinc-500 capitalize">{activity.time}</p>}
      </div>
    )
  }
  return <MoveList moves={activity.moves ?? []} />
}

function ActivityCard({ activity, srcDate, dateLogs, asOverlay = false }) {
  const [expanded, setExpanded] = useState(false)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: activity.id,
    data: { srcDate, activity },
    disabled: asOverlay,
  })

  // Auto-collapse when drag begins (long-press 500ms triggers this)
  useEffect(() => {
    if (isDragging && expanded) setExpanded(false)
  }, [isDragging, expanded])

  const done = activityDone(activity, dateLogs ?? [])
  const { title, subtitle } = headerInfo(activity)
  const showExpanded = expanded && !isDragging && !asOverlay

  const wrapperClass = `rounded-2xl border-2 transition-colors ${cardClasses(activity.kind, done)} ${
    asOverlay ? 'shadow-2xl scale-[1.04] rotate-1' : ''
  }`

  return (
    <div
      ref={asOverlay ? undefined : setNodeRef}
      style={{
        opacity: isDragging && !asOverlay ? 0.4 : 1,
        touchAction: 'none',
      }}
      className={wrapperClass}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        {...(asOverlay ? {} : listeners)}
        {...(asOverlay ? {} : attributes)}
        className="w-full flex items-center justify-between px-5 py-5 min-h-[68px] text-left select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${kindDotClass(activity.kind)}`} />
          <div className="min-w-0">
            <p className={`text-xl font-bold tracking-tight truncate ${titleClasses(activity.kind, done)}`}>
              {title}
            </p>
            {subtitle && <p className="text-xs text-zinc-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          {done && (
            <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs">✓</span>
          )}
          <span className="text-zinc-400">
            <Chevron open={showExpanded} />
          </span>
        </div>
      </button>
      {showExpanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-zinc-800 pt-3">
          <ActivityBody activity={activity} />
        </div>
      )}
    </div>
  )
}

function DayDetail({ activities, logs, dateISO, isDragActive }) {
  const dayLogs = logs.filter((l) => l.workout_date === dateISO)

  if (!activities.length) {
    return (
      <div className="mt-4 rounded-2xl border-2 border-zinc-800 px-5 py-5">
        <p className="text-zinc-500 text-sm">Rest day — drag a workout here.</p>
      </div>
    )
  }

  return (
    <div className="mt-4">
      {isDragActive && (
        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">
          Drag onto another day to move it
        </p>
      )}
      <div className="space-y-3">
        {activities.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} srcDate={dateISO} dateLogs={dayLogs} />
        ))}
      </div>
    </div>
  )
}

function DroppableDay({ dateISO, isToday, isSelected, hasLog, dayKinds, isDragActive, isOver, onClick, dayLetter }) {
  const { setNodeRef } = useDroppable({ id: dateISO })

  const ring = isOver
    ? 'ring-2 ring-emerald-400 scale-105'
    : isDragActive
    ? 'ring-1 ring-zinc-500'
    : ''

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
        isSelected
          ? 'border-zinc-400 bg-zinc-800'
          : isToday
          ? 'border-zinc-500 bg-zinc-900'
          : 'border-zinc-800 bg-zinc-900/50'
      } ${ring}`}
    >
      <span className={`text-xs font-bold uppercase tracking-wide ${isToday ? 'text-zinc-100' : 'text-zinc-500'}`}>
        {dayLetter}
      </span>
      <div className="flex gap-0.5 min-h-[8px]">
        {dayKinds.length === 0 && <span className="w-2 h-2 rounded-full bg-zinc-800" />}
        {dayKinds.map((kind, i) => (
          <span key={i} className={`w-2 h-2 rounded-full ${kindDotClass(kind)}`} />
        ))}
      </div>
      <span className={`w-2 h-2 rounded-full border transition-colors ${
        hasLog ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-700'
      }`} />
    </button>
  )
}

function formatWeekRange(weekStart) {
  const start = new Date(weekStart + 'T12:00:00')
  const end = new Date(addDays(weekStart, 6) + 'T12:00:00')
  const opts = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`
}

export default function WeekViewer() {
  const navigate = useNavigate()
  const today = todayISO()
  const [weekStart, setWeekStart] = useState(() => weekStartISO(today))
  const [selectedDay, setSelectedDay] = useState(today)
  const { weeklyPlan, logs, loading, error, refetch } = useWeekPlan(weekStart)
  const [activeDrag, setActiveDrag] = useState(null) // { activity, srcDate }
  const [overDate, setOverDate] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 500, tolerance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 500, tolerance: 5 } }),
  )

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  function prevWeek() {
    const prev = addDays(weekStart, -7)
    setWeekStart(prev)
    setSelectedDay(prev)
  }
  function nextWeek() {
    const next = addDays(weekStart, 7)
    setWeekStart(next)
    setSelectedDay(next)
  }

  const selectedDayPlan = weeklyPlan?.days?.[selectedDay] ?? null
  const selectedActivities = getActivities(selectedDayPlan, selectedDay)
  const selectedDate = new Date(selectedDay + 'T12:00:00')
  const selectedLabel = selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  const selectedDayLogs = logs.filter((l) => l.workout_date === selectedDay)

  function handleDragStart(event) {
    const { active } = event
    const data = active.data?.current
    setActiveDrag(data ? { activity: data.activity, srcDate: data.srcDate } : null)
    if (typeof navigator !== 'undefined') navigator.vibrate?.(15)
  }

  function handleDragOver(event) {
    setOverDate(event.over?.id ?? null)
  }

  async function handleDragEnd(event) {
    const { active, over } = event
    setActiveDrag(null)
    setOverDate(null)
    if (!over) return
    const srcDate = active.data?.current?.srcDate
    const dstDate = String(over.id)
    if (!srcDate || srcDate === dstDate) return
    if (!weeklyPlan?.id) return
    const updates = moveActivityBetweenDays(weeklyPlan.days ?? {}, srcDate, String(active.id), dstDate)
    if (!updates) return
    if (typeof navigator !== 'undefined') navigator.vibrate?.(10)
    try {
      await updateWeeklyPlanDays(weeklyPlan.id, updates)
      refetch()
    } catch {}
  }

  return (
    <div className="py-6">
      <button onClick={() => navigate('/dashboard/fitness')}
        className="text-xs uppercase tracking-widest text-zinc-500 mb-6 min-h-[44px] flex items-center">
        ← Today
      </button>

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={prevWeek}
          className="w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300 active:bg-zinc-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <p className="text-sm font-medium text-zinc-300">{formatWeekRange(weekStart)}</p>
        <button onClick={nextWeek}
          className="w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300 active:bg-zinc-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => { setActiveDrag(null); setOverDate(null) }}
      >
        {/* 7-day strip */}
        <div className="grid grid-cols-7 gap-1.5 mb-6">
          {days.map((dateISO, i) => {
            const dayPlan = weeklyPlan?.days?.[dateISO]
            const dayKinds = getActivities(dayPlan, dateISO).map((a) => a.kind)
            const isToday = dateISO === today
            const isSelected = dateISO === selectedDay
            const hasLog = logs.some((l) => l.workout_date === dateISO)

            return (
              <DroppableDay
                key={dateISO}
                dateISO={dateISO}
                dayLetter={DAY_LETTERS[i]}
                isToday={isToday}
                isSelected={isSelected}
                hasLog={hasLog}
                dayKinds={dayKinds}
                isDragActive={!!activeDrag}
                isOver={overDate === dateISO}
                onClick={() => setSelectedDay(dateISO)}
              />
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-6 flex-wrap">
          {[['lift', 'Lift'], ['peloton', 'Peloton'], ['stretch', 'Stretch']].map(([kind, label]) => (
            <div key={kind} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${kindDotClass(kind)}`} />
              <span className="text-xs text-zinc-500">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-zinc-500">Logged</span>
          </div>
        </div>

        {loading && <p className="text-zinc-500 text-sm uppercase tracking-widest">Loading…</p>}
        {!loading && error && (
          <div className="py-2">
            <p className="text-red-400 text-sm mb-3">Couldn't load — try again.</p>
            <button onClick={refetch} className="text-xs uppercase tracking-widest text-zinc-400 border border-zinc-700 rounded-xl px-4 min-h-[44px]">Retry</button>
          </div>
        )}

        {!loading && !error && (
          <>
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">{selectedLabel}</p>
            <DayDetail
              dateISO={selectedDay}
              activities={selectedActivities}
              logs={logs}
              isDragActive={!!activeDrag}
            />
          </>
        )}

        <DragOverlay dropAnimation={null}>
          {activeDrag && (
            <ActivityCard
              activity={activeDrag.activity}
              srcDate={activeDrag.srcDate}
              dateLogs={selectedDayLogs}
              asOverlay
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

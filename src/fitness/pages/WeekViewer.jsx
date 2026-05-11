import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { todayISO, weekStartISO, addDays } from '../lib/date.js'
import { useWeekPlan } from '../hooks/useWeekPlan.js'

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const TYPE_DOT = {
  lift:    'bg-zinc-100',
  cardio:  'bg-blue-500',
  stretch: 'bg-amber-500',
  rest:    'bg-zinc-700',
}

function typeColor(type) {
  return TYPE_DOT[type] ?? 'bg-zinc-800'
}

function Chevron({ open }) {
  return (
    <svg className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function Section({ title, subtitle, done, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`rounded-2xl border-2 transition-colors ${done ? 'border-emerald-600' : 'border-zinc-700'}`}>
      <button type="button" onClick={() => setOpen(p => !p)}
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

function DayDetail({ dateISO, dayPlan, logs }) {
  if (!dayPlan) {
    return (
      <div className="mt-4 rounded-2xl border-2 border-zinc-800 px-5 py-5">
        <p className="text-zinc-500 text-sm">No plan for this day.</p>
      </div>
    )
  }

  const dayLogs = logs.filter(l => l.workout_date === dateISO)
  const isLogged = dayLogs.length > 0
  const label = dayPlan.label ?? dayPlan.workout ?? dayPlan.type ?? 'Workout'
  const moves = dayPlan.morning_stretch?.moves ?? []

  return (
    <div className="mt-4 space-y-4">
      {dayPlan.morning_stretch && (
        <Section
          title="Morning Stretch"
          subtitle={[
            dayPlan.morning_stretch.duration_minutes ? `${dayPlan.morning_stretch.duration_minutes} min` : null,
            dayPlan.morning_stretch.focus,
          ].filter(Boolean).join(' · ')}
          done={isLogged}
        >
          <MoveList moves={moves} />
        </Section>
      )}

      {(dayPlan.type === 'lift') && (
        <Section
          title={label}
          subtitle={`${(dayPlan.exercises ?? []).length} exercise${(dayPlan.exercises ?? []).length !== 1 ? 's' : ''}`}
          done={isLogged}
        >
          {dayPlan.warmup && (
            <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 px-4 py-3 mb-1">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Warmup</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{dayPlan.warmup}</p>
            </div>
          )}
          {(dayPlan.exercises ?? []).map((ex, i) => (
            <ExerciseRow key={i} ex={ex} />
          ))}
        </Section>
      )}

      {dayPlan.peloton && (
        <Section
          title="Peloton"
          subtitle={dayPlan.peloton.workout ?? null}
          done={dayLogs.some(l => l.workout_type?.toLowerCase().includes('peloton'))}
        >
          <div className="px-1 py-2 space-y-1">
            {dayPlan.peloton.workout && (
              <p className="text-sm text-zinc-300">{dayPlan.peloton.workout}</p>
            )}
            {dayPlan.peloton.time && (
              <p className="text-xs text-zinc-500 capitalize">{dayPlan.peloton.time}</p>
            )}
          </div>
        </Section>
      )}

      {(dayPlan.type === 'rest' || dayPlan.type === 'stretch') && !dayPlan.morning_stretch && (
        <div className="rounded-2xl border-2 border-zinc-800 px-5 py-5">
          <p className="text-xl font-bold text-zinc-400">Rest Day</p>
        </div>
      )}

      {dayPlan.type === 'cardio' && (
        <Section
          title={label}
          subtitle={dayPlan.notes ?? 'Cardio'}
          done={isLogged}
        >
          <div className="px-1 py-2">
            {dayPlan.notes && <p className="text-sm text-zinc-300">{dayPlan.notes}</p>}
          </div>
        </Section>
      )}
    </div>
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

  const selectedPlan = weeklyPlan?.days?.[selectedDay] ?? null
  const selectedDate = new Date(selectedDay + 'T12:00:00')
  const selectedLabel = selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

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

      {/* 7-day strip */}
      <div className="grid grid-cols-7 gap-1.5 mb-6">
        {days.map((dateISO, i) => {
          const dayPlan = weeklyPlan?.days?.[dateISO]
          const isToday = dateISO === today
          const isSelected = dateISO === selectedDay
          const hasLog = logs.some(l => l.workout_date === dateISO)
          const type = dayPlan?.type

          return (
            <button key={dateISO} type="button" onClick={() => setSelectedDay(dateISO)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-colors ${
                isSelected
                  ? 'border-zinc-400 bg-zinc-800'
                  : isToday
                  ? 'border-zinc-500 bg-zinc-900'
                  : 'border-zinc-800 bg-zinc-900/50'
              }`}>
              <span className={`text-xs font-bold uppercase tracking-wide ${isToday ? 'text-zinc-100' : 'text-zinc-500'}`}>
                {DAY_LETTERS[i]}
              </span>
              <span className={`w-2 h-2 rounded-full ${type ? typeColor(type) : 'bg-zinc-800'}`} />
              <span className={`w-2 h-2 rounded-full border transition-colors ${
                hasLog ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-700'
              }`} />
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-6 flex-wrap">
        {[['lift', 'Lift'], ['cardio', 'Cardio'], ['stretch', 'Stretch'], ['rest', 'Rest']].map(([type, label]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${typeColor(type)}`} />
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
          <DayDetail dateISO={selectedDay} dayPlan={selectedPlan} logs={logs} />
        </>
      )}
    </div>
  )
}

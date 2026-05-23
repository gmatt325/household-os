import { useMemo } from 'react'
import { useTodaysPlan } from './useTodaysPlan.js'
import { getActivities, KIND_STRETCH, KIND_LIFT, KIND_PELOTON } from '../lib/dayShape.js'

function makeTask(id, title, completed, extra = {}) {
  return {
    id,
    title,
    category: 'workouts',
    completed,
    assigned_to: null,
    ...extra,
  }
}

function buildStretch(activity, logs) {
  const log = logs.find((l) => l.workout_type === 'Morning Stretch')
  const savedNotes = log?.notes ? log.notes.split(', ') : []
  const savedSet = new Set(savedNotes)
  const moves = activity.moves ?? []
  const children = moves.map((m, i) =>
    makeTask(`fitness:${activity.id}:move:${i}`, m, savedSet.has(m), { virtual_child: true })
  )
  const allDone = moves.length > 0 && moves.every((m) => savedSet.has(m))
  const parentTitle = activity.focus ? `Stretch · ${activity.focus}` : 'Morning Stretch'
  const parent = makeTask(`fitness:${activity.id}`, parentTitle, allDone)
  return { parent, children }
}

function exerciseIsDone(planned, loggedEx) {
  const setCount = planned.sets ?? 1
  const sets = loggedEx?.sets ?? []
  if (sets.length < setCount) return false
  const isBodyweight = planned.weight_lbs == null
  return sets.slice(0, setCount).every((s) =>
    isBodyweight ? s.duration_sec != null : s.reps != null
  )
}

function buildLift(activity, logs) {
  const label = activity.workout ?? 'Lift'
  const log = logs.find((l) => l.workout_type === label && Array.isArray(l.exercises))
  const exercises = activity.exercises ?? []
  const children = exercises.map((ex, i) => {
    const loggedEx = log?.exercises?.find((l) => l.name === ex.name)
    const done = exerciseIsDone(ex, loggedEx)
    return makeTask(`fitness:${activity.id}:ex:${i}`, ex.name, done, { virtual_child: true })
  })
  const allDone = exercises.length > 0 && children.every((c) => c.completed)
  const parent = makeTask(`fitness:${activity.id}`, label, allDone)
  return { parent, children }
}

function buildPeloton(activity, logs) {
  const log = logs.find((l) =>
    l.workout_type !== 'Morning Stretch' &&
    (l.peloton_ride_type != null || l.duration_minutes != null || l.peloton_output_watts != null)
  )
  const done = !!log && (log.duration_minutes != null || log.peloton_output_watts != null)
  const title = activity.workout ?? 'Peloton'
  const parent = makeTask(`fitness:${activity.id}`, title, done)
  return { parent, children: [] }
}

export function useTodaysFitnessVirtualTasks() {
  const { dayPlan, logs, loading, today } = useTodaysPlan()

  return useMemo(() => {
    const activities = getActivities(dayPlan, today)
    const parents = []
    const childrenByParentId = {}
    for (const activity of activities) {
      let built = null
      if (activity.kind === KIND_STRETCH) built = buildStretch(activity, logs)
      else if (activity.kind === KIND_LIFT) built = buildLift(activity, logs)
      else if (activity.kind === KIND_PELOTON) built = buildPeloton(activity, logs)
      if (!built) continue
      parents.push(built.parent)
      childrenByParentId[built.parent.id] = built.children
    }
    return { parents, childrenByParentId, loading, hasPlan: activities.length > 0 }
  }, [dayPlan, logs, loading, today])
}

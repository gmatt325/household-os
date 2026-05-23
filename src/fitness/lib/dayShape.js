// Day shape adapter — bridges legacy day plans (with `type`/`morning_stretch`/
// `exercises`/`peloton` fields) and the new `{ activities: [...] }` shape.
//
// Reads accept either shape via getActivities(). Writes should emit the new
// shape via dayFromActivities(). Once a day is written through, it's upgraded.

export const KIND_STRETCH = 'stretch'
export const KIND_LIFT = 'lift'
export const KIND_PELOTON = 'peloton'

export function newActivityId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// Deterministic id for activities derived from legacy day fields. Stable
// across renders so React keys and dnd-kit work without churn.
function legacyId(dateISO, kind) {
  return `${dateISO || 'unk'}:legacy:${kind}`
}

export function getActivities(dayPlan, dateISO = '') {
  if (!dayPlan) return []
  if (Array.isArray(dayPlan.activities)) return dayPlan.activities
  const out = []
  if (dayPlan.morning_stretch) {
    out.push({
      id: legacyId(dateISO, KIND_STRETCH),
      kind: KIND_STRETCH,
      focus: dayPlan.morning_stretch.focus,
      moves: dayPlan.morning_stretch.moves ?? [],
      duration_minutes: dayPlan.morning_stretch.duration_minutes,
    })
  }
  const isLift = dayPlan.type === 'lift' && (dayPlan.exercises?.length || dayPlan.workout || dayPlan.label)
  if (isLift) {
    out.push({
      id: legacyId(dateISO, KIND_LIFT),
      kind: KIND_LIFT,
      workout: dayPlan.workout ?? dayPlan.label ?? 'Lift',
      warmup: dayPlan.warmup,
      exercises: dayPlan.exercises ?? [],
      location: dayPlan.location,
      time: dayPlan.time,
    })
  }
  const isCardio = dayPlan.type === 'cardio' || dayPlan.peloton
  if (isCardio) {
    out.push({
      id: legacyId(dateISO, KIND_PELOTON),
      kind: KIND_PELOTON,
      workout: dayPlan.peloton?.workout ?? dayPlan.workout ?? dayPlan.label ?? 'Peloton',
      ride_type: dayPlan.peloton?.ride_type,
      time: dayPlan.peloton?.time ?? dayPlan.time,
      notes: dayPlan.notes,
    })
  }
  return out
}

export function dayFromActivities(activities, extras = {}) {
  const out = { activities }
  if (extras.notes) out.notes = extras.notes
  return out
}

// Build a new day-shape value where a single activity is replaced (by id).
// If the activity isn't found, the array is left unchanged.
export function replaceActivity(dayPlan, dateISO, activityId, updater) {
  const activities = getActivities(dayPlan, dateISO).map((a) =>
    a.id === activityId ? updater(a) : a
  )
  return dayFromActivities(activities, dayPlan ?? {})
}

// Move an activity from one day to another. Returns { [srcDate]: dayPlan, [dstDate]: dayPlan }.
// Same-day moves are a no-op (returns null).
export function moveActivityBetweenDays(daysMap, srcDate, activityId, dstDate) {
  if (srcDate === dstDate) return null
  const srcActivities = getActivities(daysMap?.[srcDate], srcDate)
  const moved = srcActivities.find((a) => a.id === activityId)
  if (!moved) return null
  // Reassign id so the migrated activity has a stable storage id, not a legacy one
  const newId = moved.id.includes(':legacy:') ? newActivityId() : moved.id
  const movedClean = { ...moved, id: newId }
  const nextSrc = srcActivities.filter((a) => a.id !== activityId)
  const nextDst = [...getActivities(daysMap?.[dstDate], dstDate), movedClean]
  return {
    [srcDate]: dayFromActivities(nextSrc, daysMap?.[srcDate] ?? {}),
    [dstDate]: dayFromActivities(nextDst, daysMap?.[dstDate] ?? {}),
  }
}

export function activityLabel(activity) {
  if (!activity) return ''
  if (activity.kind === KIND_STRETCH) return activity.focus ? `Stretch · ${activity.focus}` : 'Stretch'
  if (activity.kind === KIND_LIFT) return activity.workout ?? 'Lift'
  if (activity.kind === KIND_PELOTON) return activity.workout ?? 'Peloton'
  return activity.kind ?? 'Workout'
}

export function activitySubtitle(activity) {
  if (!activity) return ''
  if (activity.kind === KIND_STRETCH) {
    const parts = []
    if (activity.duration_minutes) parts.push(`${activity.duration_minutes} min`)
    if (activity.focus && !activity.workout) parts.push(activity.focus)
    return parts.join(' · ')
  }
  if (activity.kind === KIND_LIFT) {
    const n = activity.exercises?.length ?? 0
    return `${n} exercise${n === 1 ? '' : 's'}`
  }
  if (activity.kind === KIND_PELOTON) {
    return activity.ride_type ?? activity.notes ?? ''
  }
  return ''
}

const KIND_DOT = {
  [KIND_STRETCH]: 'bg-amber-500',
  [KIND_LIFT]: 'bg-zinc-100',
  [KIND_PELOTON]: 'bg-blue-500',
}
export function kindDotClass(kind) {
  return KIND_DOT[kind] ?? 'bg-zinc-700'
}

const KIND_BADGE = {
  [KIND_STRETCH]: 'border-amber-700 bg-amber-950/30 text-amber-300',
  [KIND_LIFT]: 'border-zinc-600 bg-zinc-800 text-zinc-100',
  [KIND_PELOTON]: 'border-blue-700 bg-blue-950/30 text-blue-300',
}
export function kindBadgeClass(kind) {
  return KIND_BADGE[kind] ?? 'border-zinc-700 bg-zinc-900 text-zinc-300'
}

// Potty/nap threshold logic for the Puppy tab.
//
// Targets come from the puppy_targets table (target_minutes / overdue_minutes),
// but the PEE target is recomputed dynamically from the puppy's age using the
// common house-training rule of thumb: a pup can hold it roughly 1 hour per month
// of age. We fall back to the seeded value when there's no DOB.

// Whole completed months (for display, e.g. "1 month old").
export function ageInMonths(dob) {
  if (!dob) return null
  const birth = new Date(dob + 'T12:00:00')
  const now = new Date()
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth()) +
    (now.getDate() >= birth.getDate() ? 0 : -1)
  return Math.max(0, months)
}

// Fractional age in months (days ÷ 30.44) — smooth ramp for the pee target so an
// ~8.5-week pup reads ~2h instead of snapping in whole-hour steps on her birthday.
export function ageInMonthsFractional(dob) {
  if (!dob) return null
  const birth = new Date(dob + 'T12:00:00')
  const days = (Date.now() - birth.getTime()) / 86400000
  return Math.max(0, days / 30.4375)
}

// ~60 min per month of age (fractional), clamped to a sane range. Overdue = target * 1.33.
// Returns { target_minutes, overdue_minutes } or null when DOB unknown.
export function dynamicPeeTarget(dob) {
  const months = ageInMonthsFractional(dob)
  if (months == null) return null
  const target = Math.round(Math.min(240, Math.max(45, months * 60)))
  return { target_minutes: target, overdue_minutes: Math.round(target * 1.33) }
}

// Merge seeded targets with the dynamic pee override. `targets` is the array of
// rows from puppy_targets; returns a map keyed by event_type.
export function resolveTargets(targets, dob) {
  const map = {}
  for (const t of targets ?? []) {
    map[t.event_type] = { target_minutes: t.target_minutes, overdue_minutes: t.overdue_minutes }
  }
  const dyn = dynamicPeeTarget(dob)
  if (dyn) map.pee = dyn
  return map
}

// ok | amber | red given elapsed seconds and a {target_minutes, overdue_minutes}.
export function statusFor(elapsedSeconds, target) {
  if (elapsedSeconds == null || !target) return 'ok'
  const mins = elapsedSeconds / 60
  if (mins >= target.overdue_minutes) return 'red'
  if (mins >= target.target_minutes) return 'amber'
  return 'ok'
}

// Ring fill 0→1: fills toward the overdue point, so green climbs to ~target,
// amber continues, and the ring is full exactly at overdue (red). Null when no
// data / no target.
export function progressFor(elapsedSeconds, target) {
  if (elapsedSeconds == null || !target?.overdue_minutes) return null
  const mins = elapsedSeconds / 60
  return Math.min(1, Math.max(0, mins / target.overdue_minutes))
}

// One contextual line for the header. Open sessions win; otherwise surface the
// most urgent tracked type (pee/poop/meal) vs its target. `now` is ms.
const URGENT_TYPES = [
  { type: 'pee', label: 'pee' },
  { type: 'poop', label: 'poop' },
  { type: 'meal', label: 'meal' },
]

function fmtMin(mins) {
  const m = Math.max(0, Math.round(mins))
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem ? `${h}h ${rem}m` : `${h}h`
}

export function smartStatus(live, resolved, now) {
  const open = live?.openByType ?? {}
  const openLabels = {
    walk: (mins) => `On a walk — ${fmtMin(mins)} in 🐾`,
    crate: (mins) => `In her crate — ${fmtMin(mins)}`,
    alone: (mins) => `Home alone — ${fmtMin(mins)}`,
  }
  for (const t of ['walk', 'crate', 'alone']) {
    if (open[t]) {
      const mins = (now - new Date(open[t].started_at).getTime()) / 60000
      return openLabels[t](mins)
    }
  }

  let best = null // { label, remaining }
  for (const { type, label } of URGENT_TYPES) {
    const last = live?.lastByType?.[type]
    const target = resolved?.[type]
    if (!last || !target?.target_minutes) continue
    const elapsedMin = (now - new Date(last.occurred_at).getTime()) / 60000
    const remaining = target.target_minutes - elapsedMin
    if (best == null || remaining < best.remaining) best = { label, remaining }
  }

  if (!best) return 'Tap a card to start tracking 🐾'
  const cap = best.label.charAt(0).toUpperCase() + best.label.slice(1)
  if (best.remaining <= 0) return `${cap} overdue by ${fmtMin(-best.remaining)}!`
  return `Next ${best.label} in ~${fmtMin(best.remaining)}`
}

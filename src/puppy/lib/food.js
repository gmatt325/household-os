// The bowl model behind food logging.
//
// Food isn't a single "she ate X%" event — it's a bowl with a running level that
// two people top up and check at random moments. Two row types in puppy_events
// describe it:
//
//   meal        food went down   { added_cups, left_pct, bowl_cups }
//   food_check  a look at it     { left_pct, bowl_cups, removed? }
//
// `left_pct` is what the user actually tapped, read against the FULL MARK — the
// level right after food last went down. That's the scale the eye uses: "¼ cup
// down, then 50% left, then 10% left" is 0.25 → 0.125 → 0.025, not each
// percentage compounded onto the one before it.
//
// `bowl_cups` is the ABSOLUTE level at that instant, computed here at write time.
// Storing the absolute value is what lets a row be read on its own — editing or
// deleting one row can't corrupt the rest of the chain, because every row is its
// own measurement rather than a delta.
//
// Legacy rows ({ made_cups, ate_pct }, written before this model) are read
// through the same normalizer and treated as a whole meal that opened and closed
// at one instant. Nothing was backfilled.

import { logEvent } from './supabaseQueries.js'

export const CUP_OPTIONS = [
  { label: '1/4', value: 0.25 },
  { label: '1/2', value: 0.5 },
  { label: '3/4', value: 0.75 },
  { label: '1', value: 1 },
]

// 100 → 0 in 5% steps, biggest first: the scroller opens on "all of it", and you
// drag left as the bowl empties. `Empty` gets its own chip beside the scroller.
export const LEFT_PCT_OPTIONS = Array.from({ length: 21 }, (_, i) => 100 - i * 5)

export const DEFAULT_ADDED_CUPS = 0.25

// A "scoop" is the unit the day is counted in: one 1/4-cup serving, three a day.
// Counting by VOLUME rather than by number-of-servings means a 1/2-cup pour
// correctly reads as two scoops instead of one. Bump DAILY_SCOOP_TARGET as she
// grows — it's the only place the goal is written down.
export const SCOOP_CUPS = 0.25
export const DAILY_SCOOP_TARGET = 3

// Below this the bowl reads as empty — kills float dust like 2e-17 left after a
// chain of percentages.
const EMPTY_EPS = 0.005

const round4 = (n) => Math.round(n * 10000) / 10000

export const near = (a, b) => Math.abs(a - b) < 0.001

export const isFoodRow = (e) => e?.event_type === 'meal' || e?.event_type === 'food_check'

// Whole scoops read as "2"; an odd pour reads as "2.4" rather than lying.
export function formatScoops(cups) {
  const n = Math.round((cups / SCOOP_CUPS) * 10) / 10
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

// "1/4" / "0.6" — cups the way they were tapped, not 0.25000000000000006.
export function formatCups(n) {
  if (!Number.isFinite(n)) return '—'
  const hit = CUP_OPTIONS.find((o) => near(o.value, n))
  if (hit) return hit.label
  return String(Math.round(n * 100) / 100)
}

// One shape for every food row, legacy included.
//   kind    'down' (food added) | 'check' (a reading)
//   bowlCups  absolute level AFTER this row
//   legacy    old { made_cups, ate_pct } row — a self-contained meal
export function normalizeFoodRow(e) {
  if (!isFoodRow(e)) return null
  const d = e.detail ?? {}
  const at = new Date(e.occurred_at).getTime()

  if (e.event_type === 'food_check') {
    const leftPct = Number(d.left_pct)
    return {
      row: e,
      kind: 'check',
      at,
      addedCups: 0,
      leftPct: Number.isFinite(leftPct) ? leftPct : 0,
      bowlCups: Number.isFinite(Number(d.bowl_cups)) ? Number(d.bowl_cups) : 0,
      removed: d.removed === true,
      legacy: false,
    }
  }

  // meal — new shape first
  const added = Number(d.added_cups)
  if (Number.isFinite(added)) {
    const leftPct = Number(d.left_pct)
    const bowl = Number(d.bowl_cups)
    return {
      row: e,
      kind: 'down',
      at,
      addedCups: added,
      leftPct: Number.isFinite(leftPct) ? leftPct : 0,
      bowlCups: Number.isFinite(bowl) ? bowl : added,
      removed: false,
      legacy: false,
    }
  }

  // legacy { made_cups, ate_pct } (and older { grams }, which carries no volume)
  const made = Number(d.made_cups)
  const atePct = Number(d.ate_pct)
  const madeCups = Number.isFinite(made) ? made : 0
  return {
    row: e,
    kind: 'down',
    at,
    addedCups: madeCups,
    leftPct: 0,
    bowlCups: 0, // a legacy row is a finished meal: it opens and closes at once
    removed: false,
    legacy: true,
    legacyEaten: madeCups * (Number.isFinite(atePct) ? atePct / 100 : 1),
  }
}

// Every food row in `events`, oldest first. Callers hand us either fetchLive's
// desc snapshot or fetchDayTimeline's asc one, so sort rather than assume.
export function foodRowsAsc(events) {
  return (events ?? [])
    .filter(isFoodRow)
    .map(normalizeFoodRow)
    .filter(Boolean)
    .sort((a, b) => a.at - b.at)
}

// What's in the bowl right now, which serving it came from, and the two numbers
// everything else needs: `fullLevel` (the mark percentages are read against) and
// `leftPct` (how full it reads as a percentage — the card's number, and what the
// sheet opens on).
export function bowlState(events) {
  const rows = foodRowsAsc(events)
  const last = rows[rows.length - 1] ?? null
  const level = last ? last.bowlCups : 0
  const hasFood = level > EMPTY_EPS

  // The copy wants the serving that's sitting there ("¼ cup down at 8:12a"),
  // which is the newest 'down' — the newest row is often a check.
  let lastDown = null
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].kind === 'down' && !rows[i].legacy) {
      lastDown = rows[i]
      break
    }
  }

  // Percentages are read against the level right after food last went down. Once
  // the bowl is empty that reference is dead — the next top-up starts from zero.
  const fullLevel = hasFood && lastDown ? lastDown.bowlCups : 0

  return {
    hasFood,
    level,
    fullLevel,
    // A 'down' row leaves the bowl at its full mark, so the honest reading right
    // after one is 100%; after a check it's whatever that check said.
    leftPct: !hasFood ? 0 : last?.kind === 'down' ? 100 : last?.leftPct ?? 100,
    lastRow: last,
    lastDown,
    downAt: hasFood && lastDown ? lastDown.at : null,
  }
}

// The full mark in effect just BEFORE a given row — what that row's `left_pct`
// was a percentage of. Editing a row's amounts has to recompute against this
// rather than against bowlState(), whose mark already reflects the row itself.
export function fullLevelBefore(events, rowId) {
  let mark = 0
  for (const r of foodRowsAsc(events)) {
    if (r.row.id === rowId) return mark
    if (r.legacy) mark = 0
    else if (r.kind === 'down') mark = r.bowlCups
    else if (r.removed || r.bowlCups <= EMPTY_EPS) mark = 0 // bowl gone: the mark dies with it
  }
  return mark
}

// Cups put down, servings, roughly how much she ate, and what's left — for one
// local day. `events` may reach back past midnight; the walk is seeded with the
// last row BEFORE the day so an 11pm bowl checked at 1am is attributed right.
export function foodDayTotals(events, midnightMs) {
  const rows = foodRowsAsc(events)

  let prevLevel = 0
  for (const r of rows) {
    if (r.at >= midnightMs) break
    prevLevel = r.bowlCups
  }

  let putDownCups = 0
  let servings = 0
  let eatenCups = 0

  for (const r of rows) {
    if (r.at < midnightMs) continue

    if (r.legacy) {
      putDownCups += r.addedCups
      servings += 1
      eatenCups += r.legacyEaten
      prevLevel = 0
      continue
    }

    if (r.kind === 'down') {
      putDownCups += r.addedCups
      servings += 1
      // The row's own claim of what was in there before the top-up.
      const levelBefore = Math.max(0, r.bowlCups - r.addedCups)
      eatenCups += Math.max(0, prevLevel - levelBefore)
    } else if (r.removed) {
      // Food taken away isn't food eaten — swallow the drop.
    } else {
      eatenCups += Math.max(0, prevLevel - r.bowlCups)
    }
    prevLevel = r.bowlCups
  }

  return {
    putDownCups: round4(putDownCups),
    servings,
    scoops: putDownCups / SCOOP_CUPS, // raw; formatScoops() for display
    eatenCups: round4(eatenCups),
    leftCups: prevLevel > EMPTY_EPS ? round4(prevLevel) : 0,
  }
}

// ---- the shared math ----
// `fullLevel` is the bowl's full mark (see the header): the level right after
// food last went down, and the thing every percentage is a fraction of.
export const levelAfterCheck = (fullLevel, leftPct) => round4(Math.max(0, fullLevel) * (leftPct / 100))
export const levelAfterDown = (fullLevel, leftPct, addedCups) =>
  round4(levelAfterCheck(fullLevel, leftPct) + Math.max(0, addedCups))

// ---- writes ----
export function logFoodDown({ fullLevel = 0, leftPct = 0, addedCups, occurredAt = null }) {
  return logEvent(
    'meal',
    {
      added_cups: addedCups,
      left_pct: leftPct,
      bowl_cups: levelAfterDown(fullLevel, leftPct, addedCups),
    },
    occurredAt,
  )
}

export function logFoodCheck({ fullLevel = 0, leftPct, removed = false, occurredAt = null }) {
  const detail = {
    left_pct: removed ? 0 : leftPct,
    bowl_cups: removed ? 0 : levelAfterCheck(fullLevel, leftPct),
  }
  if (removed) detail.removed = true
  return logEvent('food_check', detail, occurredAt)
}

// Recompute bowl_cups when an existing row's amounts are edited in place.
export function foodDetailPatch(kind, { fullLevel = 0, leftPct, addedCups, removed }) {
  if (kind === 'down') {
    return {
      added_cups: addedCups,
      left_pct: leftPct,
      bowl_cups: levelAfterDown(fullLevel, leftPct, addedCups),
    }
  }
  const detail = {
    left_pct: removed ? 0 : leftPct,
    bowl_cups: removed ? 0 : levelAfterCheck(fullLevel, leftPct),
  }
  if (removed) detail.removed = true
  return detail
}

// One-line summary of a food row for sheets and lists.
export function foodSummary(e) {
  const n = normalizeFoodRow(e)
  if (!n) return ''
  if (n.legacy) return `${formatCups(n.addedCups)} cup · ${Math.round((n.legacyEaten / (n.addedCups || 1)) * 100)}% eaten`
  if (n.kind === 'down') {
    const base = `${formatCups(n.addedCups)} cup down`
    return n.leftPct > 0 ? `${base} onto ${n.leftPct}% left` : base
  }
  if (n.removed) return 'picked up'
  return n.leftPct === 0 ? 'bowl empty' : `${n.leftPct}% left`
}

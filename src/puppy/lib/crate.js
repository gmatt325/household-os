import { isNightHour } from './nightMode.js'
import { closeSessionAt, logSession } from './supabaseQueries.js'

// A potty break ends the crate session she's in — the crate timer used to keep
// running while she was outside peeing, which made both the tile and the sleep
// bar lie. At NIGHT (the clock, 22:00–06:00 — not the ☀️/🌙 override) a fresh
// session opens at the same instant, so each row is one clean "she lasted N
// hours" stretch instead of one 8-hour block hiding four wake-ups.
//
// `atISO` is the event's own time, so a backdated pee ends the crate back there
// too. Returns the newly opened session (night) or null.
export async function endCrateForPotty(openCrate, atISO = null) {
  if (!openCrate) return null
  const at = atISO ? new Date(atISO) : new Date()
  const ms = at.getTime()
  // A backdate landing before the session began would write an end-before-start
  // row (the same shape rangeError() guards against in LogSheet) — leave it be.
  if (!Number.isFinite(ms) || ms <= new Date(openCrate.started_at).getTime()) return null

  const endedAt = at.toISOString()
  // Nothing closed = the other phone got there first; don't open a second one.
  const closed = await closeSessionAt(openCrate.id, endedAt)
  if (!closed) return null
  // Close first: the DB allows only one open session per type.
  return isNightHour(at) ? logSession('crate', endedAt) : null
}

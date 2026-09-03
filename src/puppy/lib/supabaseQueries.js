import { supabase } from '../../lib/supabase.js'

// ---- Profile ----
export async function fetchProfile() {
  const { data, error } = await supabase
    .from('puppy_profile')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertProfile(patch) {
  const existing = await fetchProfile()
  if (existing) {
    const { data, error } = await supabase
      .from('puppy_profile')
      .update(patch)
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase
    .from('puppy_profile')
    .insert([patch])
    .select('*')
    .single()
  if (error) throw error
  return data
}

// ---- Targets ----
export async function fetchTargets() {
  const { data, error } = await supabase
    .from('puppy_targets')
    .select('*')
    .eq('active', true)
  if (error) throw error
  return data ?? []
}

// ---- Live status source data ----
// Last event per type (one query via distinct on), open sessions, and the last
// closed crate session (for the "out of crate" nap timer). The client ticks
// elapsed/status from these so cards count up without re-querying.
export async function fetchLive() {
  const [lastEventsRes, openSessRes, recentSessRes] = await Promise.all([
    supabase
      .from('puppy_events')
      .select('id, event_type, occurred_at, detail, notes')
      .order('occurred_at', { ascending: false })
      .limit(200),
    supabase
      .from('puppy_sessions')
      .select('*')
      .is('ended_at', null),
    supabase
      .from('puppy_sessions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(100),
  ])
  if (lastEventsRes.error) throw lastEventsRes.error
  if (openSessRes.error) throw openSessRes.error
  if (recentSessRes.error) throw recentSessRes.error

  const lastByType = {}
  for (const row of lastEventsRes.data ?? []) {
    if (!lastByType[row.event_type]) lastByType[row.event_type] = row
  }
  const openByType = {}
  for (const s of openSessRes.data ?? []) openByType[s.session_type] = s

  // Most recent session per type (open or closed) — feeds the edit/delete UI.
  // Rows are already started_at desc, so the first seen per type is newest.
  const lastSessionByType = {}
  let lastClosedCrate = null
  for (const s of recentSessRes.data ?? []) {
    if (!lastSessionByType[s.session_type]) lastSessionByType[s.session_type] = s
    if (!lastClosedCrate && s.session_type === 'crate' && s.ended_at) lastClosedCrate = s
  }

  return {
    lastByType,
    openByType,
    lastSessionByType,
    lastClosedCrate,
    events: lastEventsRes.data ?? [], // raw recent events (for food volume, etc.)
    sessions: recentSessRes.data ?? [], // raw recent sessions (for the sleep timeline)
  }
}

// ---- Day timeline ----
// Everything that happened on one local calendar day: events inside the day, and
// sessions that overlap it at all (a crate session can start before midnight or
// still be running). fetchLive() caps at 100/200 rows, so history needs its own
// date-ranged query rather than filtering that snapshot.
export async function fetchDayTimeline(dayISO) {
  const dayStart = new Date(`${dayISO}T00:00:00`) // local midnight
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)
  const startISO = dayStart.toISOString()
  const endISO = dayEnd.toISOString()

  const [eventsRes, sessionsRes] = await Promise.all([
    supabase
      .from('puppy_events')
      .select('id, event_type, occurred_at, detail, notes')
      .gte('occurred_at', startISO)
      .lt('occurred_at', endISO)
      .order('occurred_at', { ascending: true }),
    supabase
      .from('puppy_sessions')
      .select('*')
      .lt('started_at', endISO)
      .or(`ended_at.gte.${startISO},ended_at.is.null`)
      .order('started_at', { ascending: true }),
  ])
  if (eventsRes.error) throw eventsRes.error
  if (sessionsRes.error) throw sessionsRes.error

  return {
    events: eventsRes.data ?? [],
    sessions: sessionsRes.data ?? [],
    dayStartMs: dayStart.getTime(),
    dayEndMs: dayEnd.getTime(),
  }
}

// ---- Weight history ----
// Every weight ever logged, oldest → newest, for the growth chart. No limit on
// purpose: these are weekly weigh-ins, so the whole history is a few dozen rows
// even years out — far cheaper than paging it.
export async function fetchWeightHistory() {
  const { data, error } = await supabase
    .from('puppy_events')
    .select('id, occurred_at, detail')
    .eq('event_type', 'weight')
    .order('occurred_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

// Most recent single event of a type (used to resolve the "undo last" target).
export async function fetchLastEvent(eventType) {
  const { data, error } = await supabase
    .from('puppy_events')
    .select('id, event_type, occurred_at, detail, notes')
    .eq('event_type', eventType)
    .order('occurred_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0] ?? null
}

// ---- Events ----
export async function logEvent(eventType, detail = null, occurredAt = null, notes = null) {
  const payload = { event_type: eventType }
  if (detail) payload.detail = detail
  if (occurredAt) payload.occurred_at = occurredAt
  if (notes) payload.notes = notes
  const { data, error } = await supabase
    .from('puppy_events')
    .insert([payload])
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateEvent(id, patch) {
  const { data, error } = await supabase
    .from('puppy_events')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteEvent(id) {
  const { error } = await supabase.from('puppy_events').delete().eq('id', id)
  if (error) throw error
}

// ---- Sessions ----
export async function openSession(sessionType, alone = false) {
  const { data, error } = await supabase
    .from('puppy_sessions')
    .insert([{ session_type: sessionType, alone }])
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function closeSession(id) {
  const { data, error } = await supabase
    .from('puppy_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

// Close a session at an explicit time, but ONLY while it's still open. The other
// phone may have ended it already (our snapshot is realtime but not instant), and
// a blind update would silently stretch that session to now. Returns null when
// there was nothing open to close.
export async function closeSessionAt(id, endedAt) {
  const { data, error } = await supabase
    .from('puppy_sessions')
    .update({ ended_at: endedAt })
    .eq('id', id)
    .is('ended_at', null)
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data ?? null
}

// Backdated session create: explicit started_at, optional ended_at (null = still
// running). The partial unique index still forbids a 2nd open session per type.
export async function logSession(sessionType, startedAt, endedAt = null, alone = false) {
  const payload = { session_type: sessionType, started_at: startedAt, alone }
  if (endedAt) payload.ended_at = endedAt
  const { data, error } = await supabase
    .from('puppy_sessions')
    .insert([payload])
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateSession(id, patch) {
  const { data, error } = await supabase
    .from('puppy_sessions')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteSession(id) {
  const { error } = await supabase.from('puppy_sessions').delete().eq('id', id)
  if (error) throw error
}

// ---- Daily rollup + trend (v_puppy_daily) ----
// A date range rather than "the last N rows": days with no events have no row at
// all, so a LIMIT can't tell you which calendar days it actually covered — and
// the trend card pages back through fixed 7-day windows.
export async function fetchDailyRange(fromISO, toISO) {
  const { data, error } = await supabase
    .from('v_puppy_daily')
    .select('*')
    .gte('day', fromISO)
    .lte('day', toISO)
    .order('day', { ascending: true })
  if (error) throw error
  return data ?? []
}

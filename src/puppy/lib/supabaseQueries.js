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
export async function fetchDaily(days = 7) {
  const { data, error } = await supabase
    .from('v_puppy_daily')
    .select('*')
    .order('day', { ascending: false })
    .limit(days)
  if (error) throw error
  return data ?? []
}

import { supabase } from '../../lib/supabase.js'

export async function fetchActiveProgram() {
  const { data, error } = await supabase
    .from('fitness_programs')
    .select('*')
    .eq('status', 'active')
    .single()
  if (error) throw error
  return data
}

export async function fetchWeeklyPlanForDate(dateISO) {
  const { data, error } = await supabase
    .from('fitness_weekly_plans')
    .select('*')
    .lte('week_start', dateISO)
    .gte('week_end', dateISO)
    .order('week_start', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0] ?? null
}

export async function fetchWeeklyPlanByWeekStart(weekStartISO) {
  const { data, error } = await supabase
    .from('fitness_weekly_plans')
    .select('*')
    .eq('week_start', weekStartISO)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function fetchWorkoutLogsForDate(dateISO) {
  const { data, error } = await supabase
    .from('fitness_workout_logs')
    .select('id, workout_type, exercises, notes, created_at')
    .eq('workout_date', dateISO)
  if (error) throw error
  return data ?? []
}

export async function fetchWorkoutLogsForWeek(weekStartISO, weekEndISO) {
  const { data, error } = await supabase
    .from('fitness_workout_logs')
    .select('id, workout_date, workout_type')
    .gte('workout_date', weekStartISO)
    .lte('workout_date', weekEndISO)
  if (error) throw error
  return data ?? []
}

export async function logWorkout(payload) {
  const { data, error } = await supabase
    .from('fitness_workout_logs')
    .insert([payload])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchBodyMetricsForDate(dateISO) {
  const { data, error } = await supabase
    .from('fitness_body_metrics')
    .select('id')
    .eq('logged_date', dateISO)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function insertBodyMetrics(payload) {
  const { data, error } = await supabase
    .from('fitness_body_metrics')
    .insert([payload])
    .select('id')
    .single()
  if (error) throw error
  return data
}

// Insert on first call (id=null), update on subsequent calls. Returns the id.
export async function upsertWorkoutLog(id, payload) {
  if (id) {
    const { error } = await supabase
      .from('fitness_workout_logs')
      .update(payload)
      .eq('id', id)
    if (error) throw error
    return id
  } else {
    const { data, error } = await supabase
      .from('fitness_workout_logs')
      .insert([payload])
      .select('id')
      .single()
    if (error) throw error
    return data.id
  }
}

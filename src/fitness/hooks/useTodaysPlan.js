import { useState, useEffect, useCallback } from 'react'
import { todayISO } from '../lib/date.js'
import { fetchWeeklyPlanForDate, fetchWorkoutLogsForDate } from '../lib/supabaseQueries.js'

export function useTodaysPlan() {
  const [weeklyPlan, setWeeklyPlan] = useState(null)
  const [dayPlan, setDayPlan] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const today = todayISO()

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      fetchWeeklyPlanForDate(today),
      fetchWorkoutLogsForDate(today),
    ])
      .then(([weekPlan, workoutLogs]) => {
        setWeeklyPlan(weekPlan)
        setDayPlan(weekPlan?.days?.[today] ?? null)
        setLogs(workoutLogs)
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [today])

  useEffect(() => { load() }, [load])

  return { weeklyPlan, dayPlan, logs, isCompleted: logs.length > 0, loading, error, today, refetch: load }
}

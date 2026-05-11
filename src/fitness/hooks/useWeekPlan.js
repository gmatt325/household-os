import { useState, useEffect } from 'react'
import { addDays } from '../lib/date.js'
import { fetchWeeklyPlanForDate, fetchWorkoutLogsForWeek } from '../lib/supabaseQueries.js'

export function useWeekPlan(weekStart) {
  const [weeklyPlan, setWeeklyPlan] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const weekEnd = addDays(weekStart, 6)
    Promise.all([
      fetchWeeklyPlanForDate(weekStart),
      fetchWorkoutLogsForWeek(weekStart, weekEnd),
    ])
      .then(([plan, workoutLogs]) => {
        setWeeklyPlan(plan)
        setLogs(workoutLogs)
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [weekStart])

  return { weeklyPlan, logs, loading, error }
}

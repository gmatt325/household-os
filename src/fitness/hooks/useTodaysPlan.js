import { useState, useEffect } from 'react'
import { todayISO } from '../lib/date.js'
import { fetchWeeklyPlanForDate, fetchWorkoutLogsForDate } from '../lib/supabaseQueries.js'

export function useTodaysPlan() {
  const [weeklyPlan, setWeeklyPlan] = useState(null)
  const [dayPlan, setDayPlan] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const today = todayISO()

  useEffect(() => {
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

  return { weeklyPlan, dayPlan, logs, isCompleted: logs.length > 0, loading, error, today }
}

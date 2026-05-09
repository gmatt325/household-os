import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { appliesToday } from '../lib/recurrence.js'

const CATEGORIES = ['puppy', 'todos', 'workouts', 'plant_watering']

function todayLocalISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function emptyGroups() {
  return CATEGORIES.reduce((acc, c) => ((acc[c] = []), acc), {})
}

function groupForToday(rows) {
  const today = todayLocalISO()
  const now = new Date()
  const groups = emptyGroups()
  for (const row of rows) {
    const matchesDue = row.due_date === today
    const matchesRecurring =
      !row.due_date && row.recurrence && appliesToday(row.recurrence, now)
    if (!matchesDue && !matchesRecurring) continue
    if (!groups[row.category]) continue
    groups[row.category].push(row)
  }
  for (const c of CATEGORIES) {
    groups[c].sort((a, b) =>
      String(a.created_at).localeCompare(String(b.created_at)),
    )
  }
  return groups
}

export function useTodaysTasks() {
  const [tasks, setTasks] = useState(emptyGroups())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const overridesRef = useRef(new Map())

  const applyOverrides = useCallback((groups) => {
    if (overridesRef.current.size === 0) return groups
    const next = {}
    for (const c of CATEGORIES) {
      next[c] = groups[c].map((t) => {
        const o = overridesRef.current.get(t.id)
        return o ? { ...t, ...o } : t
      })
    }
    return next
  }, [])

  const fetchAll = useCallback(async () => {
    const today = todayLocalISO()
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .or(
        `due_date.eq.${today},and(due_date.is.null,recurrence.not.is.null)`,
      )
    if (error) {
      setError(error)
      setLoading(false)
      return
    }
    const grouped = groupForToday(data ?? [])
    setTasks(applyOverrides(grouped))
    setLoading(false)
  }, [applyOverrides])

  useEffect(() => {
    fetchAll()
    const channel = supabase
      .channel('tasks-today')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          // Server confirmed — clear any optimistic override for changed row
          // (we just refetch; overrides will be reconciled by fresh data)
          overridesRef.current.clear()
          fetchAll()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAll])

  const setOptimistic = useCallback((taskId, patch) => {
    overridesRef.current.set(taskId, patch)
    setTasks((prev) => {
      const next = {}
      for (const c of CATEGORIES) {
        next[c] = prev[c].map((t) => (t.id === taskId ? { ...t, ...patch } : t))
      }
      return next
    })
  }, [])

  const clearOptimistic = useCallback((taskId) => {
    overridesRef.current.delete(taskId)
  }, [])

  return { tasks, loading, error, setOptimistic, clearOptimistic, refetch: fetchAll }
}

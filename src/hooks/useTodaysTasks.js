import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { appliesToday, mostRecentMatch } from '../lib/recurrence.js'

const CATEGORIES = ['puppy', 'todos', 'workouts', 'plant_watering']
const ROLLOVER_LOOKBACK_DAYS = 30

function todayLocal() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function toISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseISODateLocal(iso) {
  // 'YYYY-MM-DD' → local Date at midnight (avoids UTC shift)
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function emptyGroups() {
  return CATEGORIES.reduce((acc, c) => ((acc[c] = []), acc), {})
}

// Decides whether a row should appear today, and if so, the "aged_from" date
// (the original day it was meant to be done, when earlier than today).
function visibilityFor(row, today, todayISO) {
  const completedAt = row.completed_at ? new Date(row.completed_at) : null
  const completedAtLocal = completedAt
    ? new Date(completedAt.getFullYear(), completedAt.getMonth(), completedAt.getDate())
    : null
  const completedToday = completedAtLocal && completedAtLocal.getTime() === today.getTime()

  // 1. Manual (no date, no recurrence): always show unless completed today.
  if (!row.due_date && !row.recurrence) {
    if (row.completed && completedToday) return { show: true, aged_from: null }
    if (row.completed) return { show: false, aged_from: null }
    return { show: true, aged_from: null }
  }

  // 2. Dated: show on the due date, or if overdue & uncompleted.
  if (row.due_date) {
    if (row.due_date === todayISO) {
      return { show: true, aged_from: null }
    }
    const due = parseISODateLocal(row.due_date)
    if (due < today && !row.completed) {
      return { show: true, aged_from: row.due_date }
    }
    return { show: false, aged_from: null }
  }

  // 3. Recurring.
  if (row.recurrence) {
    // Treat as fresh if not completed today.
    const effectivelyIncomplete = !row.completed || !completedToday
    const matchesToday = appliesToday(row.recurrence, today)

    if (!effectivelyIncomplete) return { show: false, aged_from: null }

    if (matchesToday) {
      // Show, but also check if there's an older missed occurrence to age it.
      const lookbackStart = new Date(today)
      lookbackStart.setDate(lookbackStart.getDate() - ROLLOVER_LOOKBACK_DAYS)
      const sinceFloor = completedAtLocal && completedAtLocal > lookbackStart
        ? new Date(completedAtLocal.getTime() + 24 * 60 * 60 * 1000)
        : lookbackStart
      const priorDay = new Date(today)
      priorDay.setDate(priorDay.getDate() - 1)
      const olderMiss = priorDay >= sinceFloor
        ? mostRecentMatch(row.recurrence, sinceFloor, priorDay)
        : null
      return { show: true, aged_from: olderMiss ? toISO(olderMiss) : null }
    }

    // Doesn't match today — show only if there's an unhonored prior occurrence.
    const lookbackStart = new Date(today)
    lookbackStart.setDate(lookbackStart.getDate() - ROLLOVER_LOOKBACK_DAYS)
    const sinceFloor = completedAtLocal && completedAtLocal > lookbackStart
      ? new Date(completedAtLocal.getTime() + 24 * 60 * 60 * 1000)
      : lookbackStart
    const priorDay = new Date(today)
    priorDay.setDate(priorDay.getDate() - 1)
    const miss = priorDay >= sinceFloor
      ? mostRecentMatch(row.recurrence, sinceFloor, priorDay)
      : null
    if (miss) return { show: true, aged_from: toISO(miss) }
    return { show: false, aged_from: null }
  }

  return { show: false, aged_from: null }
}

function groupForToday(rows) {
  const today = todayLocal()
  const todayISO = toISO(today)
  const groups = emptyGroups()
  for (const row of rows) {
    const { show, aged_from } = visibilityFor(row, today, todayISO)
    if (!show) continue
    if (!groups[row.category]) continue
    groups[row.category].push({ ...row, aged_from })
  }
  for (const c of CATEGORIES) {
    groups[c].sort((a, b) => {
      // Aged tasks float to the front, oldest first.
      if (a.aged_from && !b.aged_from) return -1
      if (!a.aged_from && b.aged_from) return 1
      if (a.aged_from && b.aged_from) return a.aged_from.localeCompare(b.aged_from)
      return String(a.created_at).localeCompare(String(b.created_at))
    })
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
    const today = todayLocal()
    const todayISOStr = toISO(today)
    const lookback = new Date(today)
    lookback.setDate(lookback.getDate() - ROLLOVER_LOOKBACK_DAYS)
    const lookbackISO = toISO(lookback)

    // Fetch four buckets:
    //   a) due_date == today (any completed state, for "all checked" UI)
    //   b) overdue uncompleted: due_date >= lookback AND due_date < today AND completed = false
    //   c) manual always-on: due_date IS NULL AND recurrence IS NULL
    //   d) recurring rules: due_date IS NULL AND recurrence IS NOT NULL
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .or(
        [
          `due_date.eq.${todayISOStr}`,
          `and(due_date.gte.${lookbackISO},due_date.lt.${todayISOStr},completed.eq.false)`,
          `and(due_date.is.null,recurrence.is.null)`,
          `and(due_date.is.null,recurrence.not.is.null)`,
        ].join(','),
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

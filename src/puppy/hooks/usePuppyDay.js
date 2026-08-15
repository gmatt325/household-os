import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { fetchDayTimeline } from '../lib/supabaseQueries.js'

// Everything on one local calendar day, kept fresh by realtime — same
// subscribe→refetch pattern as usePuppyLive. Today's timeline fills in live as
// taps land on either phone; past days stay correct after an edit or delete.
export function usePuppyDay(dayISO) {
  const [data, setData] = useState({ events: [], sessions: [], dayStartMs: null, dayEndMs: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    try {
      const snapshot = await fetchDayTimeline(dayISO)
      setData(snapshot)
      setError(null)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [dayISO])

  useEffect(() => {
    setLoading(true)
    refetch()
    const channel = supabase
      .channel(`puppy-day-${dayISO}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'puppy_events' }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'puppy_sessions' }, refetch)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [refetch, dayISO])

  return { ...data, loading, error, refetch }
}

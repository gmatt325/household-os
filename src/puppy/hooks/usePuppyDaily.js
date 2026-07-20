import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { fetchDaily } from '../lib/supabaseQueries.js'

// Today's rollup + the last `days` of daily stats for the trend chart. Refetches
// on any event/session change so the rollup stays live.
export function usePuppyDaily(days = 7) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    try {
      setRows(await fetchDaily(days))
    } catch {
      // Non-critical; leave prior rows in place.
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    refetch()
    const channel = supabase
      .channel('puppy-daily')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'puppy_events' }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'puppy_sessions' }, refetch)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [refetch])

  return { rows, loading, refetch }
}

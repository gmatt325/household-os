import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { fetchDailyRange } from '../lib/supabaseQueries.js'
import { todayISO, shiftDays } from '../lib/date.js'

// The last `days` calendar days of rollups (v_puppy_daily), oldest → newest.
// The whole span the trend card can scroll back through is loaded in one query —
// ~84 rows — so paging between weeks never hits the network. Refetches on any
// event/session change so today's numbers stay live.
export function usePuppyDaily(days = 84) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    try {
      const to = todayISO()
      setRows(await fetchDailyRange(shiftDays(to, -(days - 1)), to))
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

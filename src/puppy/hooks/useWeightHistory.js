import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { fetchWeightHistory } from '../lib/supabaseQueries.js'

// Every logged weight, oldest → newest, kept fresh by realtime — same
// subscribe→refetch pattern as usePuppyDaily. A weigh-in logged on the other
// phone redraws the chart without a reload.
export function useWeightHistory() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    try {
      setRows(await fetchWeightHistory())
    } catch {
      // Non-critical; leave the prior points on the chart.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
    const channel = supabase
      .channel('puppy-weights')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'puppy_events' }, refetch)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [refetch])

  return { rows, loading, refetch }
}

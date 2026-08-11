import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { fetchLive, fetchProfile, fetchTargets } from '../lib/supabaseQueries.js'

// Fetches everything the card grid needs (profile, targets, and last-event /
// open-session snapshot) and keeps it fresh via realtime. Two phones log
// concurrently, so we subscribe to both puppy tables and refetch on any change —
// same subscribe→refetch pattern as useTodaysTasks.
export function usePuppyLive() {
  const [profile, setProfile] = useState(null)
  const [targets, setTargets] = useState([])
  const [live, setLive] = useState({ lastByType: {}, openByType: {}, lastSessionByType: {}, lastClosedCrate: null, events: [], sessions: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    try {
      const [prof, tgts, snapshot] = await Promise.all([
        fetchProfile(),
        fetchTargets(),
        fetchLive(),
      ])
      setProfile(prof)
      setTargets(tgts)
      setLive(snapshot)
      setError(null)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
    const channel = supabase
      .channel('puppy-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'puppy_events' }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'puppy_sessions' }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'puppy_profile' }, refetch)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [refetch])

  return { profile, setProfile, targets, live, loading, error, refetch }
}

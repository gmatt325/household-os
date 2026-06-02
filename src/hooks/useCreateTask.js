import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Inserts a single task row. Realtime on `public.tasks` will refresh open
// dashboards automatically; callers may also call their own refetch for snappiness.
export function useCreateTask() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const create = useCallback(async (task) => {
    setSaving(true)
    setError(null)
    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single()
    setSaving(false)
    if (error) {
      setError(error)
      throw error
    }
    return data
  }, [])

  return { create, saving, error }
}

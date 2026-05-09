import { useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useToggleTask({ setOptimistic, clearOptimistic } = {}) {
  return useCallback(
    async (task) => {
      const next = !task.completed
      const patch = {
        completed: next,
        completed_at: next ? new Date().toISOString() : null,
      }
      setOptimistic?.(task.id, patch)

      const { error } = await supabase
        .from('tasks')
        .update(patch)
        .eq('id', task.id)

      if (error) {
        // revert
        setOptimistic?.(task.id, {
          completed: task.completed,
          completed_at: task.completed_at,
        })
        console.error('toggleTask failed:', error)
      } else {
        clearOptimistic?.(task.id)
      }
    },
    [setOptimistic, clearOptimistic],
  )
}

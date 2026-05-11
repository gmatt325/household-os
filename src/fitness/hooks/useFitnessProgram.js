import { useState, useEffect } from 'react'
import { fetchActiveProgram } from '../lib/supabaseQueries.js'

export function useFitnessProgram() {
  const [program, setProgram] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchActiveProgram()
      .then(setProgram)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  return { program, loading, error }
}

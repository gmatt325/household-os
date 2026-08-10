import { useCallback, useEffect, useState } from 'react'

// Manual, persisted night mode for the Puppy tab. Never auto-switches on system
// theme. Shared across components (TabNav + page) via a custom window event so a
// toggle in one place updates the other without a reload.
const KEY = 'puppy-night-mode'
const EVENT = 'puppy-night-change'

function read() {
  return localStorage.getItem(KEY) === '1'
}

export function useNightMode() {
  const [night, setNight] = useState(read)

  useEffect(() => {
    const sync = () => setNight(read())
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync) // cross-tab
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const toggle = useCallback(() => {
    const next = !read()
    localStorage.setItem(KEY, next ? '1' : '0')
    window.dispatchEvent(new Event(EVENT))
  }, [])

  return [night, toggle]
}
